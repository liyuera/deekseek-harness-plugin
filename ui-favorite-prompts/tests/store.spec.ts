import { describe, expect, it } from 'vitest'
import { createFavoritesStore } from '../src/client/store.ts'
import type { PromptTransport } from '../src/client/transport.ts'
import type { PromptRecord } from '../src/schema.ts'

const AT = 1_700_000_000_000

/** Transport double: an in-memory list behind the same surface as the fetch one. */
function fakeTransport(seed: PromptRecord[] = []): PromptTransport & { rows: PromptRecord[] } {
  const rows = [...seed]
  return {
    rows,
    list: async () => [...rows].sort((left, right) => right.createdAt - left.createdAt),
    create: async (text, source) => {
      const record: PromptRecord = {
        id: `id${rows.length + 1}`,
        text,
        createdAt: AT + rows.length,
        ...(source === undefined ? {} : { source }),
      }
      rows.push(record)
      return record
    },
    update: async (id, text) => {
      const index = rows.findIndex(row => row.id === id)
      const next = { ...rows[index] as PromptRecord, text }
      rows[index] = next
      return next
    },
    rename: async (id, name) => ({ id, name, text: '', createdAt: 1 }),
    restore: async (record) => { rows.push(record); return record },
    remove: async (id) => { rows.splice(rows.findIndex(row => row.id === id), 1) },
  }
}

describe('createFavoritesStore', () => {
  it('mirrors the host list and indexes it by normalized text', async () => {
    const transport = fakeTransport([
      { id: 'a', text: 'Run   the\r\ntests  ', createdAt: AT },
      { id: 'b', text: '单行提示词', createdAt: AT + 1 },
    ])
    const favorites = createFavoritesStore(transport)
    expect(await favorites.actions.refresh()).toBe(true)
    const state = favorites.state.getSnapshot()
    expect(state.status).toBe('ready')
    expect(state.items).toHaveLength(2)
    // Horizontal whitespace folds; the line structure stays.
    expect(state.byText.has('Run the\ntests')).toBe(true)
    expect(state.byText.has('单行提示词')).toBe(true)
    // Newest first.
    expect(state.items[0]?.id).toBe('b')
  })

  it('reaches error state with the message when the host is unreachable', async () => {
    const transport = fakeTransport()
    transport.list = async () => { throw new Error('503 unavailable') }
    const favorites = createFavoritesStore(transport)
    expect(await favorites.actions.refresh()).toBe(false)
    expect(favorites.state.getSnapshot()).toMatchObject({ status: 'error', error: '503 unavailable' })
  })

  it('adds, updates, and removes through the transport', async () => {
    const favorites = createFavoritesStore(fakeTransport())
    await favorites.actions.refresh()
    expect(await favorites.actions.add('第一条')).toBe(true)
    const added = favorites.state.getSnapshot().items[0] as PromptRecord
    expect(await favorites.actions.update(added.id, '第二条')).toBe(true)
    expect(favorites.state.getSnapshot().byText.has('第二条')).toBe(true)
    const removed = await favorites.actions.remove(added.id)
    expect(removed?.text).toBe('第二条')
    expect(favorites.state.getSnapshot().items).toHaveLength(0)
  })

  it('keeps the previous list when a mutation fails', async () => {
    const transport = fakeTransport([{ id: 'a', text: 'keep', createdAt: AT }])
    const favorites = createFavoritesStore(transport)
    await favorites.actions.refresh()
    transport.create = async () => { throw new Error('boom') }
    expect(await favorites.actions.add('nope')).toBe(false)
    expect(favorites.state.getSnapshot().items).toHaveLength(1)
  })

  it('restores a removed record verbatim', async () => {
    const transport = fakeTransport([{ id: 'a', text: 'back', createdAt: AT }])
    const favorites = createFavoritesStore(transport)
    await favorites.actions.refresh()
    const record = await favorites.actions.remove('a')
    expect(record).not.toBeNull()
    expect(await favorites.actions.restore(record as PromptRecord)).toBe(true)
    expect(favorites.state.getSnapshot().items[0]).toEqual({ id: 'a', text: 'back', createdAt: AT })
  })
})
