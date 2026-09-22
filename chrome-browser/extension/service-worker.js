/**
 * dsh Chrome Bridge service worker: a long-lived WebSocket to the local dsh
 * host. The host pushes commands (list tabs / read / eval / click / type /
 * navigate / open / screenshot); this worker executes them against the real
 * browser and pushes results back. The open socket keeps the worker alive,
 * and the 15s ping keeps both sides honest.
 */

/** dsh web origin (change the port here when the GUI listens elsewhere). */
const WS_URL = 'ws://127.0.0.1:3080/chrome-browser/ext/ws'

let socket = null
let retryMs = 1000
let closed = false

function connect() {
  if (closed) return
  // Guard against duplicate sockets: alarms/heartbeat may call connect while
  // a live socket exists. A second socket would make the host replace (and
  // close) the current one mid-command, and the closed socket's onclose
  // schedules yet another connect — an open/close flap every ~2s.
  if (socket !== null && (socket.readyState === 0 || socket.readyState === 1)) return
  try {
    socket = new WebSocket(WS_URL)
  } catch {
    scheduleRetry()
    return
  }
  socket.onopen = () => { retryMs = 1000; trace('open') }
  socket.onmessage = (event) => { void handle(event.data) }
  socket.onerror = () => { /* onclose follows */ }
  socket.onclose = (event) => {
    trace('close ' + (event && event.code !== undefined ? event.code : '?'))
    socket = null
    scheduleRetry()
  }
}

function scheduleRetry() {
  setTimeout(connect, retryMs)
  retryMs = Math.min(retryMs * 2, 15000)
}

// MV3 service workers are suspended by Chrome after idle. The browser
// auto-pongs WS protocol pings without running JS, so the host ping alone
// does not keep this worker alive: a JS heartbeat interval keeps it warm,
// and the alarm below wakes a suspended worker so the bridge reconnects.
setInterval(() => {
  if (socket !== null && socket.readyState === 1) send({ kind: 'heartbeat' })
}, 20_000)

chrome.alarms.create('dsh-bridge', { periodInMinutes: 0.5 })
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'dsh-bridge' && (socket === null || socket.readyState !== 1)) connect()
})
chrome.runtime.onStartup.addListener(() => connect())
chrome.runtime.onInstalled.addListener(() => connect())

function send(payload) {
  if (socket !== null && socket.readyState === 1) socket.send(JSON.stringify(payload))
}

function safe(value) {
  try {
    JSON.stringify(value)
    return value
  } catch {
    return String(value)
  }
}

// Persisted trace: survives service-worker kills (storage.local). Read it via
// the `trace` diagnostic op.
function trace(msg) {
  chrome.storage.local.get({ trace: [] }, data => {
    const lines = Array.isArray(data.trace) ? data.trace : []
    lines.push(`${Date.now()} ${msg}`)
    chrome.storage.local.set({ trace: lines.slice(-300) })
  })
}
trace('boot')

async function handle(data) {
  let message
  try {
    message = JSON.parse(data)
  } catch {
    return
  }
  if (message.kind === 'ping') {
    send({ kind: 'pong' })
    return
  }
  if (message.kind !== 'commands' || !Array.isArray(message.commands)) return
  const results = []
  for (const command of message.commands) {
    trace('op ' + command.op + ' ' + command.seq)
    try {
      // One stuck op (page hang, capture on a hidden window) must never block
      // the sequential loop; each op gets its own absolute deadline.
      const outcome = await Promise.race([
        run(command),
        new Promise((resolve, reject) => setTimeout(() => reject(new Error(`${command.op} 超时(12s)`)), 12000)),
      ])
      results.push({ seq: command.seq, ok: true, data: safe(outcome) })
      trace('op-ok ' + command.seq)
    } catch (error) {
      trace('op-err ' + command.seq + ' ' + String((error && error.message) || error).slice(0, 80))
      results.push({ seq: command.seq, ok: false, error: String((error && error.message) || error) })
    }
  }
  if (results.length > 0) send({ kind: 'results', results })
}

async function run(command) {
  switch (command.op) {
    case 'list-tabs': {
      const tabs = await chrome.tabs.query({})
      return { tabs: tabs.map(tab => ({
        id: tab.id,
        title: tab.title || '',
        url: tab.url || '',
        active: tab.active === true,
        favicon: tab.favIconUrl || '',
      })) }
    }
    case 'read':
      return pageExec(command.args.tabId, readPage, [command.args.includeHtml === true])
    case 'eval':
      return pageExec(command.args.tabId, evalExpression, [command.args.expression])
    case 'click':
      return pageExec(command.args.tabId, clickSelector, [command.args.selector, command.args.all === true])
    case 'type':
      return pageExec(command.args.tabId, typeInto, [command.args.selector, command.args.text || '', command.args.clear !== false])
    case 'navigate': {
      const tab = await chrome.tabs.update(Number(command.args.tabId), { url: command.args.url })
      return { id: tab.id, title: tab.title || '', url: tab.url || '', active: tab.active === true }
    }
    case 'open': {
      const tab = await chrome.tabs.create({ url: command.args.url || 'about:blank', active: true })
      return { id: tab.id, title: tab.title || '', url: tab.url || '', active: true }
    }
    case 'screenshot': {
      const tab = await chrome.tabs.get(Number(command.args.tabId))
      await chrome.tabs.update(tab.id, { active: true })
      // The capture below snapshots the window's visible tab; give the
      // activation a beat to paint.
      await new Promise(resolve => setTimeout(resolve, 150))
      const dataUrl = await captureVisibleWithCooldown(tab.windowId)
      // Image bytes travel back as a plain HTTP POST, never as a WS JSON
      // frame: an oversized base64 frame closed the bridge right after a
      // successful capture. The host persists the upload and returns a path.
      const blob = await (await fetch(dataUrl)).blob()
      const upload = await fetch('http://127.0.0.1:3080/chrome-browser/ext/upload', {
        method: 'POST',
        headers: { 'content-type': 'application/octet-stream' },
        body: blob,
      })
      const body = await upload.json()
      if (body.ok !== true) throw new Error(body.error || '截图上传失败')
      return { path: body.path, mime: 'image/jpeg' }
    }
    case 'trace': {
      const data = await chrome.storage.local.get({ trace: [] })
      if (command.args.clear === true) await chrome.storage.local.set({ trace: [] })
      return data.trace
    }
    default:
      throw new Error(`unknown op ${command.op}`)
  }
}

// Chrome rate-limits captureVisibleTab per window (invocations close in
// time hit a quota error and screenshots fail). Serialize captures, keep a
// 800ms minimum gap, and back off once before retrying a quota refusal.
let captureChain = Promise.resolve()
let lastCaptureAt = 0

// A minimized or hidden window can make captureVisibleTab never settle,
// which would block the whole (sequential) command loop; bound it.
// JPEG at 75 keeps the payload far smaller than PNG: an oversized data URL
// (tens of MB) building a JSON message can OOM-kill the MV3 worker right
// after the capture, mid-send.
function captureWithTimeout(windowId) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const error = new Error('截图超时(10s),请确认该窗口可见')
      error.isCaptureTimeout = true
      reject(error)
    }, 10000)
    chrome.tabs.captureVisibleTab(windowId, { format: 'jpeg', quality: 75 }).then(
      data => { clearTimeout(timer); resolve(data) },
      error => { clearTimeout(timer); reject(error) },
    )
  })
}

async function captureVisibleWithCooldown(windowId) {
  const run = async () => {
    const waitMs = Math.max(0, lastCaptureAt + 800 - Date.now())
    if (waitMs > 0) await new Promise(resolve => setTimeout(resolve, waitMs))
    lastCaptureAt = Date.now()
    try {
      return await captureWithTimeout(windowId)
    } catch (error) {
      // A hidden window times out and a retry cannot help it; only quota
      // refusals deserve the back-off retry.
      if (error && error.isCaptureTimeout === true) throw error
      await new Promise(resolve => setTimeout(resolve, 1500))
      lastCaptureAt = Date.now()
      return await captureWithTimeout(windowId)
    }
  }
  captureChain = captureChain.then(run, run)
  return captureChain
}

async function pageExec(tabId, func, args) {
  const [injection] = await chrome.scripting.executeScript({
    target: { tabId: Number(tabId) },
    world: 'MAIN',
    func,
    args,
  })
  return injection !== undefined && injection.result !== undefined ? injection.result : null
}

/** MAIN-world helpers (functions are serialized; no outer scope). */

function readPage(includeHtml) {
  return {
    title: document.title,
    url: location.href,
    text: document.body ? document.body.innerText : '',
    html: includeHtml && document.documentElement ? document.documentElement.outerHTML : '',
  }
}

function evalExpression(expression) {
  const value = (0, eval)(expression)
  return value === undefined ? 'undefined' : value
}

function clickSelector(selector, all) {
  const matched = document.querySelectorAll(selector)
  let count = 0
  if (all) {
    for (const el of matched) { el.click(); count++ }
  } else if (matched.length > 0) {
    matched[0].click()
    count = 1
  }
  return count
}

function typeInto(selector, text, clear) {
  const el = document.querySelector(selector)
  if (!el) return false
  el.focus()
  if (clear) {
    if (typeof el.select === 'function') el.select()
    else {
      const range = document.createRange()
      range.selectNodeContents(el)
      const selection = window.getSelection()
      if (selection) { selection.removeAllRanges(); selection.addRange(range) }
    }
  }
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    const setter = Object.getOwnPropertyDescriptor(
      el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
      'value',
    ).set
    setter.call(el, text)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  } else {
    el.textContent = ''
    el.appendChild(document.createTextNode(text))
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }
  return true
}

connect()
