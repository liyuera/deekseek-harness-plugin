/**
 * Browser-side mirror of the saved-prompt list. The host owns the records; this
 * store owns the derived lookup index both the strip and the trigger read, and
 * rebuilds it in the same step the list changes.
 */
import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { PromptRecord, PromptSourceRef } from '../schema.ts'
import { normalizeText } from './normalize.ts'
import { promptTransport, type PromptTransport } from './transport.ts'

/** Observable state of the saved-prompt list. */
export interface FavoritesState {
  /** `loading` until the first answer; `error` when the route is unreachable. */
  readonly status: 'loading' | 'ready' | 'error'
  readonly items: readonly PromptRecord[]
  /** Normalized text to record; the only membership test the UI performs. */
  readonly byText: ReadonlyMap<string, PromptRecord>
  readonly error?: string
}

/** The complete write set of the store. */
export interface FavoritesActions {
  refresh(): Promise<boolean>
  add(text: string, source?: PromptSourceRef): Promise<boolean>
  update(id: string, text: string): Promise<boolean>
  remove(id: string): Promise<PromptRecord | null>
  restore(record: PromptRecord): Promise<boolean>
}

/** One store handle shared by the strip, the trigger source, and the settings page. */
export interface FavoritesStore {
  readonly state: SnapshotStore<FavoritesState>
  readonly actions: FavoritesActions
}

/**
 * Index the current list by normalized text. The oldest record wins, so a
 * duplicate keeps one stable identity across rebuilds.
 * @param items - current records.
 * @returns the lookup map.
 */
function indexByText(items: readonly PromptRecord[]): ReadonlyMap<string, PromptRecord> {
  const index = new Map<string, PromptRecord>()
  for (const record of [...items].sort((left, right) => left.createdAt - right.createdAt)) {
    const key = normalizeText(record.text)
    if (!index.has(key)) index.set(key, record)
  }
  return index
}

/**
 * Create the store and its actions.
 * @param transport - route transport; tests pass an in-memory double.
 * @returns the shared store handle.
 */
export function createFavoritesStore(transport: PromptTransport = promptTransport): FavoritesStore {
  const state = createSnapshotStore<FavoritesState>({ status: 'loading', items: [], byText: new Map() })

  const publish = (items: readonly PromptRecord[]): void => {
    const sorted = [...items].sort((left, right) => right.createdAt - left.createdAt)
    state.set({ status: 'ready', items: sorted, byText: indexByText(sorted) })
  }

  const refresh = async (): Promise<boolean> => {
    try {
      publish(await transport.list())
      return true
    } catch (error) {
      state.set({
        status: 'error',
        items: [],
        byText: new Map(),
        error: error instanceof Error ? error.message : String(error),
      })
      return false
    }
  }

  const mutate = async (operation: () => Promise<unknown>): Promise<boolean> => {
    try {
      await operation()
    } catch {
      return false
    }
    // A failed refresh after a successful write keeps the known list; the next
    // gesture retries.
    if (state.getSnapshot().status === 'ready') await refresh()
    return true
  }

  return {
    state,
    actions: {
      refresh,
      add: (text, source) => mutate(() => transport.create(text, source)),
      update: (id, text) => mutate(() => transport.update(id, text)),
      remove: async (id) => {
        const record = state.getSnapshot().items.find(item => item.id === id) ?? null
        if (record === null) return null
        return await mutate(() => transport.remove(id)) ? record : null
      },
      restore: record => mutate(() => transport.restore(record)),
    },
  }
}
