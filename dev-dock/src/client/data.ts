/**
 * devDock browser data layer v2: mirrors the plugin's document from the host
 * through the same-origin `/dev-dock/state` route and exposes the
 * desktop-action bridge. Both are plain HTTP because static client bundles
 * have no package-private RPC channel (host.call is a dynamic-plugin
 * builtin); the host half owns the storage domain behind that route and runs
 * the deterministic desktop actions.
 * @module @liyuera/dsh-dev-dock/client/data
 */

import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { DevDockSettings, EditorRecord } from '../schema.ts'

/** Client-visible data snapshot: document plus readiness. */
export interface DevDockData {
  /** Loading until the first accepted state read. */
  ready: boolean
  /** The document; undefined before readiness. */
  settings: DevDockSettings | undefined
}

/** One desktop-action request the browser half sends to the host route. */
export interface ActionRequest {
  action: 'list-editors' | 'open-ide' | 'open-terminal' | 'start' | 'start-work'
  workspaceId?: string
  workspaceIds?: string[]
}

/** Unary host answer (list-editors rides editors on ok). */
export interface ActionResult {
  ok: boolean
  error?: string
}

/** Start-work answer shape from the host. */
export interface StartWorkResult {
  ok: boolean
  opened: number
  started: number
  error?: string
  items: Array<{ workspaceId: string; ok: boolean; error?: string }>
}

/** Actions the UI may invoke on the data layer. */
export interface DevDockActions {
  /** Record one workspace's IDE preference (upsert by workspaceId). */
  setWorkspacePref(workspaceId: string, editor: string): Promise<void>
  /** Record one editor's manual path (upsert by name). */
  setEditorManualPath(name: string, manualPath: string): Promise<void>
  /** Record the terminal preference. */
  setTerminalApp(app: 'default' | 'iterm'): Promise<void>
  /** Record the start-work selection memory. */
  setStartWork(workspaceIds: string[]): Promise<void>
  /** Detect installed editors host-side and refresh the cache. */
  listEditors(): Promise<ActionResult>
  /** Open the workspace in its default editor. */
  openIde(workspaceId: string): Promise<ActionResult>
  /** Open a system terminal at the workspace. */
  openTerminal(workspaceId: string): Promise<ActionResult>
  /** Open editor + terminal for one workspace. */
  start(workspaceId: string): Promise<ActionResult>
  /** Open editor + terminal for the selected workspaces. */
  startWork(workspaceIds: string[]): Promise<StartWorkResult>
}

/** Canonical editor names across platforms (union for stable UI display). */
export const EDITOR_NAMES = [
  'WebStorm', 'VS Code', 'IntelliJ IDEA', 'Cursor', 'Sublime Text', 'HBuilderX',
] as const

/** RPC failure shape when the wire itself is broken. */
type FetchFailure = { fetchError: string }

/**
 * Create the devDock data layer for one client plugin fiber.
 * @param ctx - client root context, used to own the mirror's effects.
 * @returns the document mirror and the action facade.
 */
export function createDevDockData(ctx: ClientContext): {
  store: SnapshotStore<DevDockData>
  actions: DevDockActions
} {
  const store = createSnapshotStore<DevDockData>({ ready: false, settings: undefined })

  const adopt = (raw: unknown): void => {
    const settings = decodeSettings(raw)
    if (settings === undefined) return
    store.set({ ready: true, settings })
  }

  const refresh = async (): Promise<void> => {
    try {
      const response = await fetch('/dev-dock/state', { method: 'GET' })
      const answer = await response.json() as { ok?: boolean; settings?: unknown }
      if (answer.ok === true) adopt(answer.settings)
    } catch {
      // The route is unreachable until the host half has booted; the next
      // gesture or focus event retries.
    }
  }
  void refresh()

  // Multi-tab consistency without a push channel: refetch when the page
  // regains focus.
  ctx.effect(() => {
    const onFocus = (): void => { void refresh() }
    window.addEventListener('focus', onFocus)
    return () => { window.removeEventListener('focus', onFocus) }
  }, 'dev-dock: focus refresh')

  const write = async (field: keyof DevDockSettings, value: unknown): Promise<void> => {
    // Reflect the gesture immediately, then let the host's answer (its own
    // validated document) replace the optimistic copy.
    const snapshot = store.getSnapshot().settings
    if (snapshot !== undefined) store.set({ ready: true, settings: { ...snapshot, [field]: value } as DevDockSettings })
    try {
      const response = await fetch('/dev-dock/state', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ field, value }),
      })
      const answer = await response.json() as { ok?: boolean; settings?: unknown }
      if (answer.ok === true) adopt(answer.settings)
    } catch {
      // The optimistic copy stays visible; the next refresh reconciles.
    }
  }

  const actions: DevDockActions = {
    async setWorkspacePref(workspaceId, editor) {
      const current = store.getSnapshot().settings
      if (current === undefined) return
      const rest = current.workspacePrefs.filter((p) => p.workspaceId !== workspaceId)
      // Empty editor resets the preference (auto-detection default applies).
      const next = editor === '' ? rest : [...rest, { workspaceId, editor }]
      await write('workspacePrefs', next)
    },
    async setEditorManualPath(name, manualPath) {
      const current = store.getSnapshot().settings
      if (current === undefined) return
      const existing = current.editors.find((e) => e.name === name)
      const next: EditorRecord[] = existing === undefined
        ? [...current.editors, { name, manualPath }]
        : current.editors.map((e) => (e.name === name ? { ...e, manualPath } : e))
      await write('editors', next)
    },
    async setTerminalApp(app) {
      await write('terminalApp', app)
    },
    async setStartWork(workspaceIds) {
      await write('startWork', workspaceIds)
    },
    listEditors: () => rpcAction<ActionResult>('list-editors'),
    openIde: (workspaceId) => rpcAction<ActionResult>('open-ide', { workspaceId }),
    openTerminal: (workspaceId) => rpcAction<ActionResult>('open-terminal', { workspaceId }),
    start: (workspaceId) => rpcAction<ActionResult>('start', { workspaceId }),
    startWork: (workspaceIds) => rpcAction<StartWorkResult>('start-work', { workspaceIds }),
  }

  return { store, actions }
}

/** Decode the wire section into the settings document (lenient cast). */
function decodeSettings(section: unknown): DevDockSettings | undefined {
  if (section === null || typeof section !== 'object') return undefined
  const doc = section as Partial<DevDockSettings>
  if (!Array.isArray(doc.workspacePrefs) || !Array.isArray(doc.editors) || !Array.isArray(doc.startWork)) {
    return undefined
  }
  return {
    workspacePrefs: doc.workspacePrefs as DevDockSettings['workspacePrefs'],
    editors: doc.editors as EditorRecord[],
    terminalApp: doc.terminalApp === 'iterm' ? 'iterm' : 'default',
    startWork: doc.startWork,
  }
}

/**
 * POST one action to the plugin's host route.
 * @param action - action name.
 * @param extra - additional JSON fields.
 * @returns the host answer, or a fetch-failure answer when the wire failed.
 */
async function rpcAction<T = ActionResult>(action: ActionRequest['action'], extra: Record<string, unknown> = {}): Promise<T & Partial<FetchFailure>> {
  try {
    const response = await fetch('/dev-dock/action', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, ...extra }),
    })
    const raw = await response.json() as T & { error?: string } & Partial<FetchFailure>
    return raw
  } catch (error) {
    return { ok: false, error: `devDock action route unreachable: ${error instanceof Error ? error.message : String(error)}` } as unknown as T & Partial<FetchFailure>
  }
}
