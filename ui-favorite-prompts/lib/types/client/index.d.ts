/**
 * Favorite-prompts browser half: one store mirrored from the host, contributed
 * to three independent seats — the Chat node seat (bookmark strip), the input
 * trigger registry (`@` group), and the Settings section (management page).
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import { type FavoritePromptsKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** Favorite-prompts copy. */
        favoritePrompts: FavoritePromptsKey;
    }
}
/** Services the browser half reads; the fiber waits for all four. */
export declare const inject: string[];
/**
 * Wire the store and the three contributions.
 * @param ctx - browser context carrying the slot registry and the two registries.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map