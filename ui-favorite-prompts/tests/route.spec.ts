import { describe, expect, it } from 'vitest'
import { handlePromptRequest, type PromptTable } from '../src/host/route.ts'
import type { PromptRecord } from '../src/schema.ts'

/** In-memory table with the same surface the storage domain publishes. */
function fakeTable(seed: PromptRecord[] = []): PromptTable & { size(): number } {
  const rows = new Map(seed.map(record => [record.id, record]))
  return {
    entries: () => rows.entries(),
    get: key => rows.get(key),
    put: async (key, value) => { rows.set(key, value) },
    delete: async (key) => rows.delete(key),
    size: () => rows.size,
  }
}

const AT = 1_700_000_000_000

describe('handlePromptRequest', () => {
  it('lists newest first', async () => {
    const table = fakeTable([
      { id: 'a', text: 'older', createdAt: AT },
      { id: 'b', text: 'newer', createdAt: AT + 10 },
    ])
    const response = await handlePromptRequest(table, { method: 'GET' })
    expect(response).toEqual({ ok: true, items: [
      { id: 'b', text: 'newer', createdAt: AT + 10 },
      { id: 'a', text: 'older', createdAt: AT },
    ] })
  })

  it('creates a record with a host-minted id and the request source', async () => {
    const table = fakeTable()
    const response = await handlePromptRequest(
      table,
      { method: 'POST', body: { text: 'hello', source: { sessionId: 's1', seq: 3 } } },
      () => AT,
    )
    expect(response.ok).toBe(true)
    expect(response).toMatchObject({ ok: true, item: { text: 'hello', createdAt: AT, source: { sessionId: 's1', seq: 3 } } })
    expect(table.size()).toBe(1)
  })

  it('refuses an empty text', async () => {
    const response = await handlePromptRequest(fakeTable(), { method: 'POST', body: { text: '   ' } })
    expect(response).toEqual({ ok: false, error: expect.stringContaining('text') })
  })

  it('updates one record and keeps its createdAt', async () => {
    const table = fakeTable([{ id: 'a', text: 'old', createdAt: AT }])
    const response = await handlePromptRequest(table, { method: 'PATCH', body: { id: 'a', text: 'new' } })
    expect(response).toEqual({ ok: true, item: { id: 'a', text: 'new', createdAt: AT } })
  })

  it('restores a record verbatim through PUT', async () => {
    const table = fakeTable()
    const record: PromptRecord = { id: 'a', text: 'back', createdAt: AT, source: { sessionId: 's', seq: 1 } }
    const response = await handlePromptRequest(table, { method: 'PUT', body: record })
    expect(response).toEqual({ ok: true, item: record })
  })

  it('deletes by query id and reports an unknown id as 404', async () => {
    const table = fakeTable([{ id: 'a', text: 'x', createdAt: AT }])
    expect(await handlePromptRequest(table, { method: 'DELETE', queryId: 'a' })).toEqual({ ok: true })
    expect(table.size()).toBe(0)
    expect(await handlePromptRequest(table, { method: 'DELETE', queryId: 'a' })).toEqual({ ok: false, error: expect.stringContaining('404') })
  })

  it('rejects an unsupported method and a non-object body', async () => {
    expect(await handlePromptRequest(fakeTable(), { method: 'OPTIONS' })).toEqual({ ok: false, error: expect.stringContaining('405') })
    expect(await handlePromptRequest(fakeTable(), { method: 'POST', body: 'nope' })).toEqual({ ok: false, error: expect.stringContaining('400') })
  })
})

describe('handlePromptRequest names', () => {
  it('mints a mention name on create and keeps it unique', async () => {
    const table = fakeTable()
    const first = await handlePromptRequest(table, { method: 'POST', body: { text: 'git commit message' } }, () => AT)
    expect(first).toMatchObject({ ok: true, item: { name: 'git-commit-message' } })
    const second = await handlePromptRequest(table, { method: 'POST', body: { text: 'git commit message' } }, () => AT + 1)
    expect(second).toMatchObject({ ok: true, item: { name: 'git-commit-message-2' } })
  })

  it('renames through PATCH without touching text or time', async () => {
    const table = fakeTable([{ id: 'a', name: 'old', text: 'keep', createdAt: AT }])
    expect(await handlePromptRequest(table, { method: 'PATCH', body: { id: 'a', name: 'renamed' } }))
      .toEqual({ ok: true, item: { id: 'a', name: 'renamed', text: 'keep', createdAt: AT } })
  })

  it('rejects an invalid name and a duplicate name', async () => {
    const table = fakeTable([
      { id: 'a', name: 'taken', text: 'x', createdAt: AT },
      { id: 'b', name: 'other', text: 'y', createdAt: AT },
    ])
    expect(await handlePromptRequest(table, { method: 'PATCH', body: { id: 'b', name: 'two words' } }))
      .toEqual({ ok: false, error: expect.stringContaining('400') })
    expect(await handlePromptRequest(table, { method: 'PATCH', body: { id: 'b', name: 'taken' } }))
      .toEqual({ ok: false, error: expect.stringContaining('409') })
    // Renaming a record to the name it already has is not a conflict.
    expect(await handlePromptRequest(table, { method: 'PATCH', body: { id: 'a', name: 'taken' } }))
      .toMatchObject({ ok: true })
  })

  it('requires text or name on PATCH', async () => {
    const table = fakeTable([{ id: 'a', text: 'x', createdAt: AT }])
    expect(await handlePromptRequest(table, { method: 'PATCH', body: { id: 'a' } }))
      .toEqual({ ok: false, error: expect.stringContaining('400') })
  })
})
