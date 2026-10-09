import { describe, expect, it } from 'vitest'
import { createFavoritesSource, CANDIDATE_LIMIT, FAVORITES_SOURCE_ORDER } from '../src/client/trigger/source.ts'
import { zh } from '../src/client/locales.ts'
import type { FavoritesState } from '../src/client/store.ts'
import type { PromptRecord } from '../src/schema.ts'
import { normalizeText } from '../src/client/normalize.ts'

const AT = 1_700_000_000_000

function stateOf(items: PromptRecord[]): FavoritesState {
  return {
    status: 'ready',
    items,
    byText: new Map(items.map(item => [normalizeText(item.text), item])),
  }
}

const t = (key: keyof typeof zh): string => zh[key] as string

/** Candidate request carrying only the fields the source reads. */
function request(query: string) {
  return { query, position: 'inline', drilled: false, signal: new AbortController().signal } as const
}

const session = { sessionId: 's1' } as const

describe('createFavoritesSource', () => {
  const items: PromptRecord[] = [
    { id: 'a', text: 'Run the tests', createdAt: AT },
    { id: 'b', text: '第一条中文提示词\n第二行', createdAt: AT + 10 },
  ]

  it('binds the @ trigger under a unique group name', () => {
    const source = createFavoritesSource(() => stateOf(items), t)
    expect(source.trigger).toBe('@')
    expect(source.name).toBe('favorites')
    expect(source.showGroupTitle).toBe(false)
  })

  it('sorts ahead of every other @ source so the group leads the menu', () => {
    // The menu lays groups out by ascending `order`; ui-reference declares none
    // (0), so the favorites group leads the @ menu only with a negative order.
    const source = createFavoritesSource(() => stateOf(items), t)
    expect(source.order).toBe(FAVORITES_SOURCE_ORDER)
    expect(source.order ?? 0).toBeLessThan(0)
  })

  it('lists newest first with a localized section heading and a short label', async () => {
    const source = createFavoritesSource(() => stateOf(items), t)
    const candidates = await source.candidates(session, request(''))
    expect(candidates.map(candidate => candidate.value)).toEqual(['b', 'a'])
    expect(candidates[0]).toMatchObject({ name: '第一条中文提示词', label: '第一条中文提示词', section: '收藏' })
    expect(candidates[1]?.description).toBe('Run the tests')
  })

  it('filters by substring of the whole prompt, case-insensitively', async () => {
    const source = createFavoritesSource(() => stateOf(items), t)
    const candidates = await source.candidates(session, request('TESTS'))
    expect(candidates.map(candidate => candidate.value)).toEqual(['a'])
  })

  it('suffixes duplicate first lines so rows stay distinguishable', async () => {
    const duplicated: PromptRecord[] = [
      { id: 'x', text: '同名\n甲', createdAt: AT },
      { id: 'y', text: '同名\n乙', createdAt: AT + 1 },
    ]
    const source = createFavoritesSource(() => stateOf(duplicated), t)
    const candidates = await source.candidates(session, request(''))
    expect(candidates.map(candidate => candidate.name)).toEqual(['同名', '同名 (2)'])
  })

  it('caps the number of rows', async () => {
    const many: PromptRecord[] = Array.from({ length: CANDIDATE_LIMIT + 5 }, (_, index) => ({
      id: `id${index}`,
      text: `prompt ${index}`,
      createdAt: AT + index,
    }))
    const source = createFavoritesSource(() => stateOf(many), t)
    expect(await source.candidates(session, request(''))).toHaveLength(CANDIDATE_LIMIT)
  })

  it('picks a reference chip labelled with the row the user saw', async () => {
    const source = createFavoritesSource(() => stateOf(items), t)
    const [first] = await source.candidates(session, request(''))
    const outcome = source.onPick({
      candidate: first as never,
      session,
      position: 'inline',
      via: 'menu',
      action: 'pick',
      span: { start: 0, end: 2, draftRev: 1 },
    } as never)
    expect(outcome).toEqual({
      insert: {
        source: 'favorites',
        ref: '第一条中文提示词\n第二行',
        label: '第一条中文提示词',
        clipboardText: '第一条中文提示词\n第二行',
      },
    })
  })

  it('serializes a chip back to the prompt itself, for the model and for copy', async () => {
    const source = createFavoritesSource(() => stateOf(items), t)
    const ref = '第一条中文提示词\n第二行'
    expect(source.codec?.clipboardText(ref)).toBe(ref)
    await expect(source.codec?.serialize(ref, new AbortController().signal)).resolves.toBe(ref)
  })

  it('keeps the prompt inside the ref, so deleting the favorite cannot break a pending draft', async () => {
    const live: PromptRecord[] = [{ id: 'a', text: 'Run the tests', createdAt: AT }]
    const source = createFavoritesSource(() => stateOf(live), t)
    const [only] = await source.candidates(session, request(''))
    const outcome = source.onPick({
      candidate: only as never,
      session,
      position: 'inline',
      via: 'menu',
      action: 'pick',
      span: { start: 0, end: 2, draftRev: 1 },
    } as never)
    const insert = (outcome as { insert: { ref: string } }).insert
    // The user removes the favorite in Settings while the chip sits in the composer.
    live.length = 0
    await expect(source.codec?.serialize(insert.ref, new AbortController().signal)).resolves.toBe('Run the tests')
  })

  it('ignores a pick whose record is gone', () => {
    const source = createFavoritesSource(() => stateOf(items), t)
    const missing = source.onPick({
      candidate: { name: 'x', value: 'gone' } as never,
      session,
      position: 'inline',
      via: 'menu',
      action: 'pick',
      span: { start: 0, end: 2, draftRev: 1 },
    } as never)
    expect(missing).toBeUndefined()
  })
})
