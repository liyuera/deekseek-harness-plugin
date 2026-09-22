/**
 * Real-Chrome full-path smoke test. Skipped unless DSH_CHROME_SMOKE=1: it
 * launches a headless Chrome in `owned` mode, drives every tool definition
 * through its real execute path, and verifies results. Local machine only
 * (spawns Chrome + listens on a loopback port).
 */
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:net'
import { afterAll, describe, expect, it } from 'vitest'
import type { ToolDefinition } from '@deepseek-ai/dsh-tools'
import { CdpBackend } from '../src/backend.ts'
import { SessionBindings } from '../src/bindings.ts'
import { Chrome, resolveChromeConfig } from '../src/chrome.ts'
import { chromeToolDefinitions } from '../src/tools.ts'

const isSmoke = process.env.DSH_CHROME_SMOKE === '1'

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address !== null ? address.port : 0
      server.close(() => resolve(port))
    })
  })
}

describe.skipIf(!isSmoke)('chrome-browser smoke (real headless Chrome)', () => {
  let config = resolveChromeConfig({ mode: 'owned', port: 59322 })
  let chrome: Chrome
  const bindings = new SessionBindings()
  let definitions: ToolDefinition[] = []

  const run = async (name: string, args: Record<string, unknown>, exec: unknown = {}): Promise<Record<string, unknown>> => {
    const definition = definitions.find(candidate => candidate.name === name)
    if (definition === undefined) throw new Error(`tool ${name} not registered`)
    return await definition.execute(args as never, exec as never) as unknown as Record<string, unknown>
  }

  afterAll(() => {
    chrome?.dispose()
  })

  it('drives the full tool surface', async () => {
    config = resolveChromeConfig({
      mode: 'owned',
      port: await freePort(),
      profileDir: join(tmpdir(), `dsh-chrome-smoke-${Date.now()}`),
      screenshotDir: join(tmpdir(), 'dsh-chrome-smoke-shots'),
    })
    chrome = new Chrome(config, { extraArgs: ['--headless=new'], pollIntervalMs: 200 })
    await chrome.ensure()
    definitions = chromeToolDefinitions(new CdpBackend(chrome), config, bindings)
    expect(definitions.length).toBe(8)
    const page = '<html><head><title>Smoke</title></head><body>'
      + '<h1>hello smoke</h1>'
      + '<button id="go" onclick="document.getElementById(\'out\').textContent=\'clicked\'">go</button>'
      + '<input id="inp"/>'
      + '<div id="out"></div>'
      + '</body></html>'
    const url = `data:text/html;charset=utf-8,${encodeURIComponent(page)}`

    // chrome_open then tabs
    const opened = await run('chrome_open', { url })
    const tabId = String(opened.tabId)
    expect(tabId.length).toBeGreaterThan(0)
    const tabs = await run('chrome_tabs', {})
    expect((tabs.tabs as Array<{ id: string }>).some(tab => tab.id === tabId)).toBe(true)
    expect(tabs.session).toBeNull()

    // bind the tab to the session and verify the default resolution
    bindings.set('smoke-session', [tabId])
    const boundTabs = await run('chrome_tabs', {}, { agent: { session: { id: 'smoke-session' } } })
    expect((boundTabs.session as { tabIds: string[] }).tabIds).toEqual([tabId])

    // read: title + visible text
    const read = await run('chrome_read', { tabId })
    expect(read.title).toBe('Smoke')
    expect(String(read.text)).toContain('hello smoke')

    // click
    const clicked = await run('chrome_click', { tabId, selector: '#go' })
    expect(clicked.clicked).toBe(1)
    const afterClick = await run('chrome_eval', { tabId, expression: "document.getElementById('out').textContent" })
    expect(String(afterClick.value)).toContain('clicked')

    // type (with clear semantics on an empty field)
    const typed = await run('chrome_type', { tabId, selector: '#inp', text: 'world' })
    expect(typed.cleared).toBe(true)
    const afterType = await run('chrome_eval', { tabId, expression: "document.getElementById('inp').value" })
    expect(String(afterType.value)).toContain('world')

    // eval arithmetic
    const evaluated = await run('chrome_eval', { tabId, expression: '1 + 1' })
    expect(String(evaluated.value)).toContain('2')

    // screenshot
    const shot = await run('chrome_screenshot', { tabId })
    const shotPath = String(shot.path)
    expect(existsSync(shotPath)).toBe(true)
    expect(statSync(shotPath).size).toBeGreaterThan(0)
    expect(shot.bytes).toBe(statSync(shotPath).size)

    // navigate to a second page and read it
    const secondUrl = `data:text/html;charset=utf-8,${encodeURIComponent('<html><title>Two</title><body>second page</body></html>')}`
    const navigated = await run('chrome_navigate', { tabId, url: secondUrl })
    expect(navigated.url).toBe(secondUrl)
    const readSecond = await run('chrome_read', { tabId })
    expect(String(readSecond.text)).toContain('second page')
  }, 120_000)

  it('reaches the browser through the user-mode relaunch path', async () => {
    // isRunning=false → no stop; real headless Chrome spawn lands on the
    // profile COPY of a fixture source (never the user's real profile) in
    // user mode.
    const profileSource = join(tmpdir(), `dsh-chrome-smoke-src-${Date.now()}`)
    mkdirSync(profileSource, { recursive: true })
    writeFileSync(join(profileSource, 'Bookmarks'), '{}')
    const userConfig = resolveChromeConfig({
      mode: 'user',
      autoRelaunch: true,
      port: await freePort(),
      profileDir: join(tmpdir(), `dsh-chrome-smoke-user-${Date.now()}`),
      screenshotDir: join(tmpdir(), 'dsh-chrome-smoke-shots'),
    })
    const userChrome = new Chrome(userConfig, {
      extraArgs: ['--headless=new'],
      pollIntervalMs: 200,
      platformOps: { isRunning: async () => false, stop: async () => {} },
      userProfileSource: profileSource,
    })
    try {
      expect(userChrome.config.mode).toBe('user')
      await userChrome.ensure()
      const tabs = await userChrome.listTabs()
      expect(tabs.length).toBeGreaterThan(0)
      expect(existsSync(join(userConfig.profileDir, 'Bookmarks'))).toBe(true)
    } finally {
      userChrome.dispose()
    }
  }, 120_000)
})
