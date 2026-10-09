// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { createFavoritesStore } from '../src/client/store.ts'
import { FavoriteStrip, type FavoriteStripProps } from '../src/client/strip/FavoriteStrip.tsx'
import { favoriteStripDefinition, FAVORITE_STRIP_KIND } from '../src/client/strip/definition.ts'
import { zh } from '../src/client/locales.ts'
import type { PromptRecord } from '../src/schema.ts'
import type { PromptTransport } from '../src/client/transport.ts'

// vitest runs without testing-library's global auto-cleanup hook.
afterEach(cleanup)

/** Minimal transport double. */
function transport(rows: PromptRecord[] = []): PromptTransport {
  return {
    list: async () => rows,
    create: async (text, source) => {
      const record: PromptRecord = {
        id: `id${rows.length + 1}`,
        text,
        createdAt: 1,
        ...(source === undefined ? {} : { source }),
      }
      rows.push(record)
      return record
    },
    update: async (id, text) => ({ id, text, createdAt: 1 }),
    rename: async (id, name) => ({ id, name, text: '', createdAt: 1 }),
    restore: async record => { rows.push(record); return record },
    remove: async (id) => { rows.splice(rows.findIndex(row => row.id === id), 1) },
  }
}

/** Props carrying the shares the strip reads; unrelated seats stay unused. */
function propsFor(favorites: ReturnType<typeof createFavoritesStore>, text: string): FavoriteStripProps {
  return {
    node: {
      key: 'k',
      kind: FAVORITE_STRIP_KIND,
      id: 'm1',
      target: 'chat',
      anchorSeq: 3,
      location: { kind: 'unresolved' },
      visibility: 'visible',
      data: { text, seq: 3 },
    },
    sessionId: 's1',
    useFavorites: (selector: (state: ReturnType<typeof favorites.state.getSnapshot>) => unknown) =>
      selector(favorites.state.getSnapshot()),
    actions: favorites.actions,
    t: (key: keyof typeof zh, params?: Record<string, string>) => {
      const template = zh[key] as string
      return params === undefined
        ? template
        : template.replace(/\{(\w+)\}/gu, (_, name: string) => params[name] ?? '')
    },
  } as unknown as FavoriteStripProps
}

describe('favoriteStripDefinition', () => {
  it('matches user-authored messages and derives the anchor from the event', () => {
    const event = {
      type: 'user/message',
      seq: 7,
      time: 1,
      surfaceOp: 'append',
      data: { id: 'm7', content: [{ type: 'text', text: 'hello' }], source: { kind: 'user' } },
    }
    expect(favoriteStripDefinition.match(event as never)).toEqual({ id: 'm7', role: 'start' })
  })

  it('ignores plugin-injected context and empty text', () => {
    const injected = {
      type: 'user/message',
      seq: 8,
      time: 1,
      surfaceOp: 'append',
      data: { id: 'm8', content: [{ type: 'text', text: 'ctx' }], source: { kind: 'plugin', plugin: 'x' } },
    }
    const empty = {
      type: 'user/message',
      seq: 9,
      time: 1,
      surfaceOp: 'append',
      data: { id: 'm9', content: [], source: { kind: 'user' } },
    }
    expect(favoriteStripDefinition.match(injected as never)).toBeNull()
    expect(favoriteStripDefinition.match(empty as never)).toBeNull()
  })

  it('keeps the node key prefix ahead of the built-in user node', () => {
    // The ordering contract: `${kind.length}:${kind}` must sort after
    // `13:input-message` for the strip to land below the bubble.
    const prefix = `${FAVORITE_STRIP_KIND.length}:${FAVORITE_STRIP_KIND}`
    expect(prefix.localeCompare('13:input-message')).toBeGreaterThan(0)
  })
})

describe('FavoriteStrip', () => {
  it('saves the message on click', async () => {
    const favorites = createFavoritesStore(transport())
    await favorites.actions.refresh()
    render(<FavoriteStrip {...propsFor(favorites, 'Run the tests')} />)
    await act(async () => { screen.getByRole('button', { name: zh['strip.favorite'] }).click() })
    expect(favorites.state.getSnapshot().items[0]?.text).toBe('Run the tests')
  })

  it('shows the saved state and offers an undo after unfavoriting', async () => {
    const favorites = createFavoritesStore(transport([{ id: 'a', text: 'Run the tests', createdAt: 1 }]))
    await favorites.actions.refresh()
    render(<FavoriteStrip {...propsFor(favorites, 'Run the tests')} />)
    await act(async () => { screen.getByRole('button', { name: zh['strip.unfavorite'] }).click() })
    expect(favorites.state.getSnapshot().items).toHaveLength(0)
    await act(async () => { screen.getByRole('button', { name: zh['strip.undo'] }).click() })
    expect(favorites.state.getSnapshot().items[0]).toEqual({ id: 'a', text: 'Run the tests', createdAt: 1 })
  })

  it('marks the control as saved when the same text lives in another session', async () => {
    const favorites = createFavoritesStore(transport([{ id: 'a', text: 'shared', createdAt: 1 }]))
    await favorites.actions.refresh()
    render(<FavoriteStrip {...propsFor(favorites, 'shared')} />)
    expect(screen.getByRole('button', { name: zh['strip.unfavorite'] })).toBeTruthy()
  })

  it('treats a whitespace-only difference as the same saved prompt', async () => {
    const favorites = createFavoritesStore(transport([{ id: 'a', text: 'Run  the\ntests', createdAt: 1 }]))
    await favorites.actions.refresh()
    render(<FavoriteStrip {...propsFor(favorites, '  Run the\ntests  ')} />)
    expect(screen.getByRole('button', { name: zh['strip.unfavorite'] })).toBeTruthy()
  })
})

describe('FavoriteStrip citations', () => {
  const saved: PromptRecord[] = [
    { id: 'a', name: '生成commit', text: '根据git diff 的结果，给我生成commit msg', createdAt: 1 },
    { id: 'b', name: '运行测试', text: 'Run the tests', createdAt: 2 },
  ]

  /** Render the strip for one message text over a ready store. */
  async function renderStrip(text: string, rows: PromptRecord[] = saved): Promise<void> {
    const favorites = createFavoritesStore(transport(rows))
    await favorites.actions.refresh()
    render(<FavoriteStrip {...propsFor(favorites, text)} />)
  }

  it('lists the names this message cites', async () => {
    await renderStrip('照 @生成commit 办')
    expect(screen.getByRole('button', { name: zh['strip.expand'] }).textContent)
      .toContain('引用了 @生成commit')
  })

  it('keeps citation order and marks the ones that no longer exist', async () => {
    await renderStrip('@运行测试 和 @已删除的 都看一下')
    const summary = screen.getByRole('button', { name: zh['strip.expand'] }).textContent ?? ''
    expect(summary.indexOf('@运行测试')).toBeLessThan(summary.indexOf('@已删除的'))
    expect(summary).toContain('（未找到）')
  })

  it('reports mentions beyond the expansion cap', async () => {
    await renderStrip('@生成commit @运行测试 @c @d')
    expect(screen.getByRole('button', { name: zh['strip.expand'] }).textContent).toContain('另有 1 条未展开')
  })

  it('stays out of the way when the message cites nothing', async () => {
    await renderStrip('就是普通的一句话')
    expect(screen.queryByRole('button', { name: zh['strip.expand'] })).toBeNull()
    expect(screen.getByRole('button', { name: zh['strip.favorite'] })).toBeTruthy()
  })

  it('renders no citation line before the list is known', () => {
    const favorites = createFavoritesStore(transport(saved))
    // No refresh: the store is still loading, so nothing can be resolved.
    render(<FavoriteStrip {...propsFor(favorites, '照 @生成commit 办')} />)
    expect(screen.queryByRole('button', { name: zh['strip.expand'] })).toBeNull()
  })

  it('shows the cited text on demand and hides it again', async () => {
    await renderStrip('照 @生成commit 办')
    const toggle = screen.getByRole('button', { name: zh['strip.expand'] })
    expect(screen.queryByText('根据git diff 的结果，给我生成commit msg')).toBeNull()
    await act(async () => { toggle.click() })
    expect(screen.getByText('根据git diff 的结果，给我生成commit msg')).toBeTruthy()
    expect(screen.getByRole('button', { name: zh['strip.collapse'] }).getAttribute('aria-expanded')).toBe('true')
    await act(async () => { screen.getByRole('button', { name: zh['strip.collapse'] }).click() })
    expect(screen.queryByText('根据git diff 的结果，给我生成commit msg')).toBeNull()
  })

  it('shows every cited prompt in the expanded body', async () => {
    await renderStrip('@运行测试 @生成commit')
    await act(async () => { screen.getByRole('button', { name: zh['strip.expand'] }).click() })
    expect(screen.getByText('Run the tests')).toBeTruthy()
    expect(screen.getByText('根据git diff 的结果，给我生成commit msg')).toBeTruthy()
  })
})
