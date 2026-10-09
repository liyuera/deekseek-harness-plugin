/**
 * Favorite-prompts browser half: one store mirrored from the host, contributed
 * to three independent seats — the Chat node seat (bookmark strip), the input
 * trigger registry (`@` group), and the Settings section (management page).
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { InputTriggerServiceContract } from '@deepseek-ai/dsh-client-ui-input-trigger/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import { FavoritesSettingsPage } from './settings/FavoritesSettingsPage.tsx'
import { FavoriteStrip } from './strip/FavoriteStrip.tsx'
import { favoriteStripDefinition, FAVORITE_STRIP_KIND } from './strip/definition.ts'
import { createFavoritesSource } from './trigger/source.ts'
import { createFavoritesStore } from './store.ts'
import { en, NS, zh, type FavoritePromptsKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Favorite-prompts copy. */
    favoritePrompts: FavoritePromptsKey
  }
}

/** Services the browser half reads; the fiber waits for all four. */
export const inject = ['slots', 'locale', 'uiConversation', 'inputTriggers']

/**
 * Wire the store and the three contributions.
 * @param ctx - browser context carrying the slot registry and the two registries.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'favorite-prompts: dictionaries')
  const t = ctx.locale.bind(NS)

  const favorites = createFavoritesStore()
  void favorites.actions.refresh()

  // Multi-tab consistency without a push channel: refetch when the page regains
  // focus.
  ctx.effect(() => {
    const onFocus = (): void => { void favorites.actions.refresh() }
    window.addEventListener('focus', onFocus)
    return () => { window.removeEventListener('focus', onFocus) }
  }, 'favorite-prompts: focus refresh')

  // 1. Bookmark strip under every user message. The registry ties a Definition
  // to its own context, not to this fiber, so the contribution rides an effect
  // to stay HMR-safe (a lingering Definition would also collide on re-apply).
  ctx.effect(
    () => ctx.uiConversation.events.register(favoriteStripDefinition),
    'favorite-prompts: strip definition',
  )
  // Like the Definition above, an injection is released by the registry's own
  // effect rather than this fiber, so it rides one here to stay HMR-safe.
  ctx.effect(
    () => ctx.slots.inject('conversation.chat.node', () => ctx.slots.register({
      name: 'conversation.chat.node',
      key: FAVORITE_STRIP_KIND,
      locale: NS,
      inject: () => ({ hooks: { favorites: favorites.state }, actions: favorites.actions }),
    }, FavoriteStrip)),
    'favorite-prompts: strip slot',
  )

  // 2. `@` group listing saved prompts.
  const inputTriggers = ctx.get('inputTriggers') as InputTriggerServiceContract
  ctx.effect(
    () => inputTriggers.registerSource(createFavoritesSource(() => favorites.state.getSnapshot(), t)),
    'favorite-prompts: @ source',
  )

  // 3. Settings page.
  ctx.effect(
    () => ctx.slots.inject('settings.section', () => ctx.slots.register({
      name: 'settings.section',
      id: 'favorite-prompts',
      order: 30,
      label: () => t('nav'),
      locale: NS,
      inject: () => ({ hooks: { favorites: favorites.state }, actions: favorites.actions }),
    }, FavoritesSettingsPage)),
    'favorite-prompts: settings section',
  )
}
