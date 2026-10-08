/** Favorite-prompts browser half. Real wiring lands in Task 8. */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import type { FavoritePromptsKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** Favorite-prompts copy. */
        favoritePrompts: FavoritePromptsKey;
    }
}
/** Required browser services. */
export declare const inject: string[];
/** Browser plugin body. */
export declare function apply(_ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map