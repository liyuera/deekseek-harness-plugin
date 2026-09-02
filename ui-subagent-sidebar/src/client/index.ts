/**
 * Subagent overview plugin, browser half: contributes two entries to
 * `shell.overlay` — a running-count capsule and a root-grouped overview
 * panel — both fed by the session-list catalog mirrors (`byId`,
 * `subagentsByParent`, workspace archive set), so the package issues no RPC
 * and holds no data of its own. The two entries share one viewing store
 * (open/collapse/filter state) instantiated here.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { SubagentSidebarCapsule } from './SubagentSidebarCapsule.tsx'
import { SubagentSidebarPanel, type SubagentSidebarPanelInjected } from './SubagentSidebarPanel.tsx'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import { createSubagentSidebarStore } from './stores.ts'
import { en, NS, zh, type SubagentSidebarKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Subagent overview copy. */
    'subagentSidebar': SubagentSidebarKey
  }
}

export type { SubagentSidebarCapsuleProps } from './SubagentSidebarCapsule.tsx'
export type { SubagentSidebarPanelProps, SubagentSidebarPanelInjected } from './SubagentSidebarPanel.tsx'

/** Required services for catalog refresh and slot contributions. */
export const inject = ['sessions', 'slots', 'locale']

/**
 * Client plugin body: register the dictionaries and both overlay entries.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-subagent-sidebar: dictionaries')
  const sessions = ctx.sessions
  // One shared handle: the capsule opens the panel, the panel reports its
  // own close, and both survive remounts through the same store.
  const store = createSubagentSidebarStore()

  const panelInjected = (): SubagentSidebarPanelInjected => ({
    openChild(parentSessionId: SessionId, childSessionId: SessionId, mode: 'one-shot' | 'continuable') {
      sessions.openSubagent({ parentSessionId, childSessionId, mode })
    },
    refresh(parentSessionId: SessionId) {
      void sessions.refreshSubagents(parentSessionId)
    },
    setCatalogOpen(parentSessionId: SessionId, open: boolean) {
      sessions.setSubagentCatalogOpen(parentSessionId, open)
    },
  })

  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'subagent-sidebar-capsule',
    order: 50,
    locale: NS,
    store,
  }, SubagentSidebarCapsule))
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'subagent-sidebar-panel',
    order: 100,
    locale: NS,
    store,
    inject: panelInjected,
  }, SubagentSidebarPanel))
}
