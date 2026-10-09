// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createFavoritesStore } from '../src/client/store.ts'
import { FavoritesSettingsPage, type FavoritesSettingsProps } from '../src/client/settings/FavoritesSettingsPage.tsx'
import { zh } from '../src/client/locales.ts'
import type { PromptRecord } from '../src/schema.ts'
import type { PromptTransport } from '../src/client/transport.ts'

// vitest runs without testing-library's global auto-cleanup hook.
afterEach(cleanup)

function transport(rows: PromptRecord[]): PromptTransport {
  return {
    list: async () => rows,
    create: async (text) => {
      const record: PromptRecord = { id: `id${rows.length + 1}`, text, createdAt: 9 }
      rows.push(record)
      return record
    },
    update: async (id, text) => {
      const index = rows.findIndex(row => row.id === id)
      const next = { ...rows[index] as PromptRecord, text }
      rows[index] = next
      return next
    },
    rename: async (id, name) => {
      const index = rows.findIndex(row => row.id === id)
      const next = { ...rows[index] as PromptRecord, name }
      rows[index] = next
      return next
    },
    restore: async record => { rows.push(record); return record },
    remove: async (id) => { rows.splice(rows.findIndex(row => row.id === id), 1) },
  }
}

function propsFor(favorites: ReturnType<typeof createFavoritesStore>): FavoritesSettingsProps {
  return {
    close: () => {},
    useFavorites: (selector: (state: ReturnType<typeof favorites.state.getSnapshot>) => unknown) =>
      selector(favorites.state.getSnapshot()),
    actions: favorites.actions,
    t: (key: keyof typeof zh, params?: Record<string, string>) => {
      const template = zh[key] as string
      return params === undefined
        ? template
        : template.replace(/\{(\w+)\}/gu, (_, name: string) => params[name] ?? '')
    },
  } as unknown as FavoritesSettingsProps
}

describe('FavoritesSettingsPage', () => {
  it('shows the empty state when nothing is saved', async () => {
    const favorites = createFavoritesStore(transport([]))
    await favorites.actions.refresh()
    render(<FavoritesSettingsPage {...propsFor(favorites)} />)
    expect(screen.getByText(zh['settings.empty'])).toBeTruthy()
  })

  it('shows the unavailable notice when the route failed', async () => {
    const failing = transport([])
    failing.list = async () => { throw new Error('503 down') }
    const favorites = createFavoritesStore(failing)
    await favorites.actions.refresh()
    render(<FavoritesSettingsPage {...propsFor(favorites)} />)
    expect(screen.getByText(/503 down/u)).toBeTruthy()
  })

  it('edits one record in place', async () => {
    const favorites = createFavoritesStore(transport([{ id: 'a', text: 'old', createdAt: 1 }]))
    await favorites.actions.refresh()
    render(<FavoritesSettingsPage {...propsFor(favorites)} />)
    await act(async () => { screen.getByRole('button', { name: zh['settings.edit'] }).click() })
    const editor = screen.getByRole('textbox', { name: zh['settings.text'] })
    await act(async () => { fireEvent.change(editor, { target: { value: 'new' } }) })
    await act(async () => { screen.getByRole('button', { name: zh['settings.save'] }).click() })
    expect(favorites.state.getSnapshot().items[0]?.text).toBe('new')
  })

  it('deletes only after the second click', async () => {
    const favorites = createFavoritesStore(transport([{ id: 'a', text: 'bye', createdAt: 1 }]))
    await favorites.actions.refresh()
    render(<FavoritesSettingsPage {...propsFor(favorites)} />)
    await act(async () => { screen.getByRole('button', { name: zh['settings.delete'] }).click() })
    expect(favorites.state.getSnapshot().items).toHaveLength(1)
    await act(async () => { screen.getByRole('button', { name: zh['settings.confirmDelete'] }).click() })
    expect(favorites.state.getSnapshot().items).toHaveLength(0)
  })

  it('cancels an edit without writing', async () => {
    const favorites = createFavoritesStore(transport([{ id: 'a', text: 'keep', createdAt: 1 }]))
    await favorites.actions.refresh()
    render(<FavoritesSettingsPage {...propsFor(favorites)} />)
    await act(async () => { screen.getByRole('button', { name: zh['settings.edit'] }).click() })
    const editor = screen.getByRole('textbox', { name: zh['settings.text'] })
    await act(async () => { fireEvent.change(editor, { target: { value: 'discarded' } }) })
    await act(async () => { screen.getByRole('button', { name: zh['settings.cancel'] }).click() })
    expect(favorites.state.getSnapshot().items[0]?.text).toBe('keep')
  })

  it('adds a prompt typed by hand', async () => {
    const favorites = createFavoritesStore(transport([]))
    await favorites.actions.refresh()
    render(<FavoritesSettingsPage {...propsFor(favorites)} />)
    await act(async () => { screen.getByRole('button', { name: zh['settings.new'] }).click() })
    const editor = screen.getByPlaceholderText(zh['settings.placeholder'])
    await act(async () => { fireEvent.change(editor, { target: { value: '手写的提示词' } }) })
    await act(async () => { screen.getByRole('button', { name: zh['settings.save'] }).click() })
    expect(favorites.state.getSnapshot().items[0]?.text).toBe('手写的提示词')
  })
})

describe('FavoritesSettingsPage names', () => {
  it('shows the mention name and renames through the host', async () => {
    const favorites = createFavoritesStore(transport([{ id: 'a', name: 'old', text: 'keep', createdAt: 1 }]))
    await favorites.actions.refresh()
    render(<FavoritesSettingsPage {...propsFor(favorites)} />)
    expect(screen.getByText(/@old/u)).toBeTruthy()
    await act(async () => { screen.getByRole('button', { name: zh['settings.edit'] }).click() })
    const nameInput = screen.getByRole('textbox', { name: zh['settings.name'] })
    await act(async () => { fireEvent.change(nameInput, { target: { value: 'renamed' } }) })
    await act(async () => { screen.getByRole('button', { name: zh['settings.save'] }).click() })
    expect(favorites.state.getSnapshot().items[0]?.name).toBe('renamed')
  })

  it('keeps the row open and reports the reason when the host rejects a rename', async () => {
    const failing = transport([{ id: 'a', name: 'old', text: 'keep', createdAt: 1 }])
    failing.rename = async () => { throw new Error('409 name "taken" is already used by another saved prompt') }
    const favorites = createFavoritesStore(failing)
    await favorites.actions.refresh()
    render(<FavoritesSettingsPage {...propsFor(favorites)} />)
    await act(async () => { screen.getByRole('button', { name: zh['settings.edit'] }).click() })
    const nameInput = screen.getByRole('textbox', { name: zh['settings.name'] })
    await act(async () => { fireEvent.change(nameInput, { target: { value: 'taken' } }) })
    await act(async () => { screen.getByRole('button', { name: zh['settings.save'] }).click() })
    expect(screen.getByRole('alert').textContent).toContain('409')
    // The row stays open and nothing was written.
    expect(screen.getByRole('button', { name: zh['settings.save'] })).toBeTruthy()
    expect(favorites.state.getSnapshot().items[0]?.name).toBe('old')
  })
})
