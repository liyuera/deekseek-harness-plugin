/**
 * devDock plugin v2, browser half: registers the locale dictionary, the
 * sidebar footer start-work button, the three session-header action buttons
 * (IDE / terminal / start), the start-work dialog, and the devDock settings
 * page. All entries share one viewing store and the settings data mirror.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { createDevDockData, type DevDockActions } from './data.ts'
import { createDevDockStore } from './stores.ts'
import { StartWorkButton, type StartWorkButtonInjected } from './StartWorkButton.tsx'
import { StartWorkModal, type StartWorkModalInjected } from './StartWorkModal.tsx'
import { SessionActionButton, type SessionActionKind, type SessionActionInjected } from './SessionActionButton.tsx'
import { DevDockSettingsPage, type DevDockSettingsInjected } from './DevDockSettingsPage.tsx'
import { en, NS, zh, type DevDockKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** devDock panel copy. */
    devDock: DevDockKey
  }
}

export type { StartWorkButtonProps, StartWorkButtonInjected } from './StartWorkButton.tsx'
export type { StartWorkModalProps, StartWorkModalInjected } from './StartWorkModal.tsx'
export type { SessionActionButtonProps, SessionActionInjected } from './SessionActionButton.tsx'
export type { DevDockSettingsPageProps, DevDockSettingsInjected } from './DevDockSettingsPage.tsx'
export type { DevDockData, DevDockActions } from './data.ts'

/** Shared overlay data face. */
interface ModalInjected extends StartWorkModalInjected {}

/** Required services for data binding and slot contributions. */
export const inject = ['slots', 'locale', 'settingsScope']

/**
 * Client plugin body: register dictionaries and every surface entry.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dev-dock: dictionaries')
  const t = ctx.locale.bind(NS)
  const view = createDevDockStore()
  const data = createDevDockData(ctx)
  const dataHandle = data.store
  const dataActions: DevDockActions = data.actions

  const modalInjected = (): ModalInjected => ({
    hooks: { devDockData: dataHandle },
    dataActions,
  })

  // Sidebar foot: the start-work button above Settings.
  const footerInjected = (): StartWorkButtonInjected => ({
    hooks: { devDockData: dataHandle },
  })
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action',
    id: 'dev-dock-start',
    order: 5,
    locale: NS,
    store: view,
    inject: footerInjected,
  }, StartWorkButton))

  // Session header: IDE / terminal / start for the current session's workspace.
  const headerInjected = (action: SessionActionKind) => (): SessionActionInjected => ({
    action,
    dataActions,
    hooks: { devDockData: dataHandle },
  })
  ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
    name: 'conversation.session.header.actions',
    id: 'dev-dock-ide',
    order: 30,
    locale: NS,
    inject: headerInjected('ide'),
  }, SessionActionButton))
  ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
    name: 'conversation.session.header.actions',
    id: 'dev-dock-terminal',
    order: 31,
    locale: NS,
    inject: headerInjected('terminal'),
  }, SessionActionButton))
  ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
    name: 'conversation.session.header.actions',
    id: 'dev-dock-start',
    order: 32,
    locale: NS,
    inject: headerInjected('start'),
  }, SessionActionButton))

  // Start-work dialog on the frame-wide overlay.
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'dev-dock-start-modal',
    order: 300,
    locale: NS,
    store: view,
    inject: modalInjected,
  }, StartWorkModal))

  // Settings page: devDock preferences.
  const settingsInjected = (): DevDockSettingsInjected => ({
    hooks: { devDockData: dataHandle },
    dataActions,
  })
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'dev-dock',
    order: 12,
    label: () => t('settings.title'),
    locale: NS,
    inject: settingsInjected,
  }, DevDockSettingsPage))
}
