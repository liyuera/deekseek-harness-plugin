/**
 * devDock browser data layer: binds the plugin's settings namespace through
 * the settingsScope service and exposes a snapshot store plus mutation
 * actions to the UI. Agent-facing actions (open IDE / terminal / quick-start)
 * are routed through the current session's prompt so the approval pipeline
 * and tool cards apply.
 * @module @liyuera/dsh-dev-dock/client/api
 */

import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { SettingsScope } from '@deepseek-ai/dsh-client-runtime/client'
import type { DevDockSettings, EditorRecord, ProjectRecord, QuickStartPlan } from '../schema.ts'

// The single-package plugin compiles host and browser halves in one program.
// The host half pulls the host `Context.sessions` merge (SessionStore) through
// dsh-user-approval → dsh-session, so the browser ISessions face is shadowed
// here; the client sessions service still implements ISessions at runtime.
// These minimal local faces keep the browser code independent of the shadowed
// declaration (mirror of the main repo's "one program must not hold both
// sides" rule, resolved locally because out-of-tree packages cannot split
// aggregates).
interface ClientSessions {
  list: { getSnapshot(): { current: string | undefined } }
  scope(id: string): { conversation?: { send(text: string): Promise<void> } } | undefined
}
type ClientSessionsCtx = ClientContext & { sessions: ClientSessions }

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** The ui-settings settingsScope service (declared locally: the package
     *  root's own augmentation is not pulled by type-only imports). */
    settingsScope: {
      bind<T>(spec: {
        namespace: string
        decode?: (section: unknown) => T | undefined
      }): SettingsScope<T>
    }
  }
}

/** Client-visible data snapshot: settings document plus readiness. */
export interface DevDockData {
  /** Loading until the first accepted settings section. */
  ready: boolean
  /** The settings document; undefined before readiness. */
  settings: DevDockSettings | undefined
}

/** Actions the UI may invoke on the data layer. */
export interface DevDockActions {
  /** Upsert one project record (id minted host-side on insert). */
  saveProject(project: Omit<ProjectRecord, 'id' | 'createdAt'>): Promise<void>
  /** Remove one project; cascades quick-start references host-side. */
  removeProject(projectId: string): Promise<void>
  /** Replace the editor records. */
  setEditors(editors: EditorRecord[]): Promise<void>
  /** Replace the quick-start plans. */
  setQuickStarts(plans: QuickStartPlan[]): Promise<void>
  /** Replace one quick-start plan. */
  setQuickStartPlan(plan: QuickStartPlan): Promise<void>
  /** Prompt the current session to run a devDock action tool. */
  promptAgent(text: string): Promise<boolean>
}

/**
 * Create the devDock data layer for one client plugin fiber.
 * @param ctx - client root context (needs settingsScope, remote, connection).
 * @returns the data store and action facade.
 */
export function createDevDockData(ctx: ClientContext): {
  store: SnapshotStore<DevDockData>
  actions: DevDockActions
} {
  const scope: SettingsScope<DevDockSettings> = ctx.settingsScope.bind({
    namespace: 'dev-dock',
    decode: decodeSettings,
  })
  const store = createSnapshotStore<DevDockData>({ ready: false, settings: undefined })

  // Mirror the settings scope snapshot into the store.
  const reflect = (): void => {
    const snapshot = scope.getSnapshot()
    store.set({
      ready: snapshot.status === 'ready',
      settings: snapshot.value,
    })
  }
  reflect()
  const unsubscribe = scope.subscribe(reflect)
  ctx.effect(() => unsubscribe, 'dev-dock: settings mirror')

  const write = async (field: keyof DevDockSettings, value: unknown): Promise<void> => {
    await scope.set(field, value)
  }

  const actions: DevDockActions = {
    async saveProject(project) {
      const current = store.getSnapshot().settings
      if (current === undefined) return
      const projects = upsertLocal(current.projects, project)
      await write('projects', projects)
    },
    async removeProject(projectId) {
      const current = store.getSnapshot().settings
      if (current === undefined) return
      const projects = current.projects.filter((p) => p.id !== projectId)
      const quickStarts = current.quickStarts
        .map((plan) => ({
          ...plan,
          items: plan.items.filter((item) => item.projectId !== projectId),
        }))
        .filter((plan) => plan.items.length > 0)
      await write('projects', projects)
      await write('quickStarts', quickStarts)
    },
    async setEditors(editors) {
      await write('editors', editors)
    },
    async setQuickStarts(plans) {
      await write('quickStarts', plans)
    },
    async setQuickStartPlan(plan) {
      const current = store.getSnapshot().settings
      if (current === undefined) return
      const existing = current.quickStarts.find((p) => p.name === plan.name)
      const quickStarts = existing
        ? current.quickStarts.map((p) => (p.name === plan.name ? plan : p))
        : [...current.quickStarts, plan]
      await write('quickStarts', quickStarts)
    },
    async promptAgent(text) {
      return promptCurrentSession(ctx, text)
    },
  }

  return { store, actions }
}

/** Decode the wire section into the settings document (lenient cast). */
function decodeSettings(section: unknown): DevDockSettings | undefined {
  if (section === null || typeof section !== 'object') return undefined
  const doc = section as Partial<DevDockSettings>
  if (!Array.isArray(doc.projects) || !Array.isArray(doc.editors) || !Array.isArray(doc.quickStarts)) {
    return undefined
  }
  return {
    projects: doc.projects as ProjectRecord[],
    editors: doc.editors as EditorRecord[],
    quickStarts: doc.quickStarts as QuickStartPlan[],
    terminalApp: doc.terminalApp === 'iterm' ? 'iterm' : 'default',
  }
}

/** Local upsert mirroring the host-side semantics (path is the unique key). */
function upsertLocal(
  projects: readonly ProjectRecord[],
  project: Omit<ProjectRecord, 'id' | 'createdAt'>,
): ProjectRecord[] {
  const existing = projects.find((p) => p.path === project.path)
  const stored: ProjectRecord = {
    ...project,
    id: existing?.id ?? String(Math.max(0, ...projects.map((p) => Number(p.id) || 0)) + 1),
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  }
  return existing
    ? projects.map((p) => (p.path === project.path ? stored : p))
    : [...projects, stored]
}

/**
 * Queue a user action through the current session's prompt so the agent
 * executes the matching dev-dock tool under the approval pipeline. Sends
 * through the ui-conversation service on the current session's scope.
 * @param ctx - client root context.
 * @param text - instruction text for the agent.
 * @returns true when a session accepted the prompt.
 */
async function promptCurrentSession(ctx: ClientContext, text: string): Promise<boolean> {
  const sessions = (ctx as ClientSessionsCtx).sessions
  const current = sessions.list.getSnapshot().current
  if (current === undefined) return false
  const scoped = sessions.scope(current)
  if (scoped === undefined) return false
  const conversation = scoped.conversation
  if (conversation === undefined) return false
  try {
    await conversation.send(text)
    return true
  } catch {
    return false
  }
}
