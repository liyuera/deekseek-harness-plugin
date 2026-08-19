/**
 * devDock plugin, browser half: registers the locale dictionary and the two
 * surface entries — the sidebar footer action row (opens the drawer) and the
 * shell.overlay drawer panel. Both entries share one viewing store and the
 * settings data mirror.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { createDevDockData } from './api.ts'
import { createDevDockStore } from './stores.ts'
import { DevDockEntry, type DevDockEntryInjected } from './DevDockEntry.tsx'
import { DevDockDrawer, type DevDockDrawerInjected } from './DevDockDrawer.tsx'
import { en, NS, zh, type DevDockKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** devDock panel copy. */
    devDock: DevDockKey
  }
}

export type { DevDockEntryProps, DevDockEntryInjected } from './DevDockEntry.tsx'
export type { DevDockDrawerProps, DevDockDrawerInjected } from './DevDockDrawer.tsx'
export type { DevDockData, DevDockActions } from './api.ts'

/** Required services for data binding and slot contributions. */
export const inject = ['slots', 'locale', 'settingsScope', 'sessions']

/**
 * Client plugin body: register dictionaries and both surface entries.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dev-dock: dictionaries')
  const view = createDevDockStore()
  const { store: dataStore, actions: dataActions } = createDevDockData(ctx)

  const entryInjected = (): DevDockEntryInjected => ({
    hooks: { devDockData: dataStore },
  })
  const drawerInjected = (): DevDockDrawerInjected => ({
    hooks: { devDockData: dataStore },
    actions: dataActions,
    promptAgent: (text) => dataActions.promptAgent(text),
  })

  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action',
    id: 'dev-dock',
    order: 10,
    locale: NS,
    store: view,
    inject: entryInjected,
  }, DevDockEntry))

  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'dev-dock-drawer',
    order: 100,
    locale: NS,
    store: view,
    inject: drawerInjected,
  }, DevDockDrawer))
}
