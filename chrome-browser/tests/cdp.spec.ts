import { describe, expect, it } from 'vitest'
import { cdpEndpoint, type CdpSocket } from '../src/cdp.ts'

/** Deterministic in-memory CDP transport. */
class FakeSocket implements CdpSocket {
  readonly ready = Promise.resolve()
  readonly sent: string[] = []
  private readonly listeners = new Set<(data: string) => void>()
  private closed = false

  send(data: string): void {
    this.sent.push(data)
  }

  onMessage(listener: (data: string) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  close(): void {
    this.closed = true
  }

  get isClosed(): boolean {
    return this.closed
  }

  private emit(message: unknown): void {
    const data = JSON.stringify(message)
    for (const listener of this.listeners) listener(data)
  }

  reply(id: number, result: Record<string, unknown> = {}): void {
    this.emit({ id, result })
  }

  fail(id: number, message: string): void {
    this.emit({ id, error: { code: -32000, message } })
  }

  event(method: string): void {
    this.emit({ method })
  }
}

/** One macrotask: lets `call`'s await-ready microtask register and send the frame. */
const flush = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0))

describe('cdpEndpoint', () => {
  it('sends framed commands and resolves on the matching reply', async () => {
    const socket = new FakeSocket()
    const endpoint = cdpEndpoint(socket, { timeoutMs: 1000 })
    const pending = endpoint.call('Page.navigate', { url: 'https://example.com' })
    await flush()
    expect(JSON.parse(socket.sent[0]!)).toEqual({ id: 1, method: 'Page.navigate', params: { url: 'https://example.com' } })
    socket.reply(1, { frameId: 'f1' })
    await expect(pending).resolves.toEqual({ frameId: 'f1' })
    endpoint.close()
  })

  it('rejects with the CDP error message', async () => {
    const socket = new FakeSocket()
    const endpoint = cdpEndpoint(socket, { timeoutMs: 1000 })
    const pending = endpoint.call('Runtime.evaluate', { expression: '1' })
    await flush()
    socket.fail(1, 'expression is not a function')
    await expect(pending).rejects.toThrow('expression is not a function')
    endpoint.close()
  })

  it('assigns incrementing ids for concurrent calls', async () => {
    const socket = new FakeSocket()
    const endpoint = cdpEndpoint(socket, { timeoutMs: 1000 })
    const first = endpoint.call('A', {})
    const second = endpoint.call('B', {})
    await flush()
    expect(socket.sent.map(item => JSON.parse(item).id)).toEqual([1, 2])
    socket.reply(2, { ok: 'b' })
    socket.reply(1, { ok: 'a' })
    await expect(first).resolves.toEqual({ ok: 'a' })
    await expect(second).resolves.toEqual({ ok: 'b' })
    endpoint.close()
  })

  it('rejects on timeout', async () => {
    const socket = new FakeSocket()
    const endpoint = cdpEndpoint(socket, { timeoutMs: 15 })
    await expect(endpoint.call('Runtime.evaluate', {})).rejects.toThrow('timed out after 15ms')
    endpoint.close()
  })

  it('rejects pending calls when closed', async () => {
    const socket = new FakeSocket()
    const endpoint = cdpEndpoint(socket, { timeoutMs: 5000 })
    const pending = endpoint.call('Page.navigate', { url: 'x' })
    await flush()
    endpoint.close()
    await expect(pending).rejects.toThrow('CDP endpoint closed')
  })

  it('ignores events and unknown ids', async () => {
    const socket = new FakeSocket()
    const endpoint = cdpEndpoint(socket, { timeoutMs: 1000 })
    const pending = endpoint.call('Runtime.evaluate', { expression: '1' })
    await flush()
    socket.event('Page.loadEventFired')
    socket.reply(99, { nope: true })
    socket.reply(1, { result: { type: 'string', value: 'ok' } })
    await expect(pending).resolves.toEqual({ result: { type: 'string', value: 'ok' } })
    endpoint.close()
  })
})
