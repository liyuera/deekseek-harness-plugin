/**
 * Extension-bridge backend unit tests: command queueing, frame round-trips
 * (with a fake duplex that speaks the wire), reconnect semantics, and the
 * offline ensure() error. No real Chrome or network is involved.
 */
import { EventEmitter } from 'node:events'
import type { Duplex } from 'node:stream'
import { describe, expect, it, vi } from 'vitest'
import { ExtensionBackend } from '../src/backend.ts'
import { resolveChromeConfig } from '../src/chrome.ts'

/** A fake upgraded socket: captures written bytes, feeds responses back. */
class FakeSocket extends EventEmitter implements Duplex {
  written: Buffer[] = []
  destroyed = false

  write(chunk: Buffer | string): boolean {
    this.written.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    return true
  }

  end(): void {}
  destroy(): void {
    this.destroyed = true
  }

  /** Feed raw bytes (e.g. a masked client frame) to the connection parser. */
  feed(chunk: Buffer): void {
    this.emit('data', chunk)
  }

  /** Encode one masked client text frame (per RFC 6455). */
  static clientText(text: string): Buffer {
    const payload = Buffer.from(text, 'utf8')
    const mask = Buffer.from([0x12, 0x34, 0x56, 0x78])
    const masked = Buffer.allocUnsafe(payload.length)
    for (let i = 0; i < payload.length; i++) masked[i] = payload[i]! ^ mask[i & 3]!
    let header: Buffer
    if (payload.length < 126) {
      header = Buffer.from([0x81, 0x80 | payload.length])
    } else if (payload.length <= 0xffff) {
      header = Buffer.alloc(4)
      header[0] = 0x81
      header[1] = 0x80 | 126
      header.writeUInt16BE(payload.length, 2)
    } else {
      header = Buffer.alloc(10)
      header[0] = 0x81
      header[1] = 0x80 | 127
      header.writeBigUInt64BE(BigInt(payload.length), 2)
    }
    return Buffer.concat([header, mask, masked])
  }

  /** The last server frame's text payload (unmasked, text opcode). */
  lastServerText(): string | undefined {
    for (let i = this.written.length - 1; i >= 0; i--) {
      const frame = this.written[i]!
      const payload = frame.subarray(2)
      if ((frame[0]! & 0x0f) === 0x1) return payload.toString('utf8')
    }
    return undefined
  }
}

function makeBackend(autoRelaunchTimeout = 100) {
  const backend = new ExtensionBackend(resolveChromeConfig({ timeoutMs: autoRelaunchTimeout }))
  const socket = new FakeSocket()
  backend.attach(socket as never, Buffer.alloc(0))
  return { backend, socket }
}

describe('ExtensionBackend', () => {
  it('rejects with an install hint when nothing is attached', async () => {
    const backend = new ExtensionBackend(resolveChromeConfig({ timeoutMs: 80 }))
    await expect(backend.ensure()).rejects.toThrow('chrome://extensions')
  })

  it('queues a command, sends it over the wire and resolves on the result', async () => {
    const { backend, socket } = makeBackend()
    const outcome = backend.listTabs()
    await new Promise(resolve => setTimeout(resolve, 10))
    const sent = socket.lastServerText()
    expect(sent).not.toBeUndefined()
    const message = JSON.parse(sent!) as { kind: string; commands: Array<{ seq: number; op: string }> }
    expect(message.kind).toBe('commands')
    expect(message.commands[0]?.op).toBe('list-tabs')
    const seq = message.commands[0]!.seq
    const reply = JSON.stringify({ kind: 'results', results: [{ seq, ok: true, data: { tabs: [{ id: 7, title: 'T', url: 'u', active: true, favicon: 'f' }] } }] })
    socket.feed(FakeSocket.clientText(reply))
    await expect(outcome).resolves.toMatchObject([{ id: '7', title: 'T' }])
  })

  it('rejects with the extension error message', async () => {
    const { backend, socket } = makeBackend()
    const outcome = backend.evaluate('1', 'boom()')
    await new Promise(resolve => setTimeout(resolve, 10))
    const sent = JSON.parse(socket.lastServerText()!) as { commands: Array<{ seq: number }> }
    const seq = sent.commands[0]!.seq
    socket.feed(FakeSocket.clientText(JSON.stringify({
      kind: 'results',
      results: [{ seq, ok: false, error: 'page crashed' }],
    })))
    await expect(outcome).rejects.toThrow('page crashed')
  })

  it('times out an unanswered command', async () => {
    const { backend } = makeBackend(50)
    await expect(backend.listTabs()).rejects.toThrow('超时')
  })

  it('rejects side-effectful commands immediately when the bridge detaches', async () => {
    const { backend, socket } = makeBackend(5000)
    let rejection: Error | undefined
    const outcome = backend.click('1', '#go', false).catch((error: Error) => { rejection = error })
    socket.emit('close')
    backend.detach()
    await outcome
    expect(rejection?.message).toContain('已断开')
  })

  it('keeps side-effect-free commands through a disconnect and resends on reconnect', async () => {
    const { backend, socket } = makeBackend(300)
    const outcome = backend.listTabs()
    void outcome.catch(() => { /* defensive: resolved via reconnect below */ })
    await new Promise(resolve => setTimeout(resolve, 10))
    socket.emit('close')
    backend.detach()
    // not rejected immediately; the grace window holds it
    let settled = false
    void outcome.finally(() => { settled = true })
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(settled).toBe(false)
    // reconnect and see the command re-sent, then answer it
    const socket2 = new FakeSocket()
    backend.attach(socket2 as never, Buffer.alloc(0))
    await new Promise(resolve => setTimeout(resolve, 10))
    const sent = JSON.parse(socket2.lastServerText()!) as { commands: Array<{ seq: number; op: string }> }
    expect(sent.commands[0]?.op).toBe('list-tabs')
    socket2.feed(FakeSocket.clientText(JSON.stringify({
      kind: 'results',
      results: [{ seq: sent.commands[0]!.seq, ok: true, data: { tabs: [] } }],
    })))
    await expect(outcome).resolves.toEqual([])
  })

  it('de-duplicates concurrent side-effectful commands by key', async () => {
    const { backend, socket } = makeBackend(5000)
    const first = backend.click('7', '#go', false)
    const second = backend.click('7', '#go', false)
    await new Promise(resolve => setTimeout(resolve, 10))
    // exactly one wire command (the second joined it)
    const sent = socket.lastServerText()!
    expect((JSON.parse(sent) as { commands: unknown[] }).commands).toHaveLength(1)
    const seq = (JSON.parse(sent) as { commands: Array<{ seq: number }> }).commands[0]!.seq
    socket.feed(FakeSocket.clientText(JSON.stringify({
      kind: 'results',
      results: [{ seq, ok: true, data: 1 }],
    })))
    await expect(first).resolves.toBe(1)
    await expect(second).resolves.toBe(1)
  })

  it('does NOT replay an unsettled open command after a detach/reconnect', async () => {
    const { backend, socket } = makeBackend(5000)
    const outcome = backend.openTab('https://example.com/new')
    void outcome.catch(() => { /* defensive: settled via reuse below */ })
    await new Promise(resolve => setTimeout(resolve, 10))
    // delivered but never acknowledged; bridge drops
    socket.emit('close')
    backend.detach()
    // reconnect with a fresh socket: the side-effectful `open` must NOT be
    // re-sent; the safe inner list-tabs may be (reuse guard resolves it).
    const socket2 = new FakeSocket()
    backend.attach(socket2 as never, Buffer.alloc(0))
    await new Promise(resolve => setTimeout(resolve, 10))
    const sentText = JSON.stringify(socket2.written.map(b => b.toString('utf8')))
    expect(sentText).not.toContain('example.com/new')
    const sent = JSON.parse(socket2.lastServerText()!) as { commands: Array<{ seq: number; op: string }> }
    if (sent.commands[0]?.op === 'list-tabs') {
      socket2.feed(FakeSocket.clientText(JSON.stringify({
        kind: 'results',
        results: [{ seq: sent.commands[0]!.seq, ok: true, data: { tabs: [{ id: 9, title: 'Existing', url: 'https://example.com/new', active: true, favicon: '' }] } }],
      })))
    }
    await expect(outcome).resolves.toMatchObject({ id: '9' })
  }, 8000)

  it('reuses an existing tab for the same url instead of re-opening', async () => {
    const { backend, socket } = makeBackend(5000)
    const outcome = backend.openTab('https://example.com/')
    await new Promise(resolve => setTimeout(resolve, 10))
    const sent = JSON.parse(socket.lastServerText()!) as { commands: Array<{ seq: number }> }
    // answer the internal list-tabs with an existing tab
    const seq = sent.commands[0]!.seq
    socket.feed(FakeSocket.clientText(JSON.stringify({
      kind: 'results',
      results: [{ seq, ok: true, data: { tabs: [{ id: 9, title: 'Existing', url: 'https://example.com/', active: true, favicon: '' }] } }],
    })))
    await expect(outcome).resolves.toMatchObject({ id: '9', title: 'Existing' })
    // only the list-tabs command was sent; no 'open' followed
    expect(sent.commands.some(cmd => cmd.op === 'open')).toBe(false)
  })

  it('sends keep-alive pings to the LIVE socket after a reconnect', () => {
    const { backend, socket } = makeBackend(5000)
    vi.useFakeTimers()
    try {
      socket.emit('close')
      backend.detach()
      const socket2 = new FakeSocket()
      backend.attach(socket2 as never, Buffer.alloc(0))
      vi.advanceTimersByTime(10_000)
      const liveText = socket2.written.map(b => b.toString('utf8')).join('\n')
      const oldText = socket.written.map(b => b.toString('utf8')).join('\n')
      expect(liveText).toContain('kind":"ping')
      expect(oldText).not.toContain('kind":"ping')
    } finally {
      vi.useRealTimers()
    }
  })

  it('reports connection state', () => {
    const { backend } = makeBackend()
    expect(backend.isConnected()).toBe(true)
    backend.detach()
    expect(backend.isConnected()).toBe(false)
  })
})
