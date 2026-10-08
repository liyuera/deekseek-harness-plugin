/** Favorite-prompts browser half. Real wiring lands in Task 8. */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: the locale namespace merge point this entry augments. This import
// must be present here — a bare `declare module` with no import of its target
// does not resolve against the workspace project graph.
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type { FavoritePromptsKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Favorite-prompts copy. */
    favoritePrompts: FavoritePromptsKey
  }
}

/** Required browser services. */
export const inject = ['slots', 'locale']

/** Browser plugin body. */
export function apply(_ctx: ClientContext): void {}
