/**
 * `@` trigger source listing saved prompts. The menu's own group title is
 * owned by ui-input-trigger's dictionary, so this source declares no group
 * title and carries a localized `section` heading on every row instead.
 */
import type { InputTriggerSource } from '@deepseek-ai/dsh-client-ui-input-trigger/client';
import type { FavoritePromptsKey } from '../locales.ts';
import type { FavoritesState } from '../store.ts';
/** Translation seat of this plugin's dictionary. */
export type Translate = (key: FavoritePromptsKey, params?: Record<string, string>) => string;
/** Source name; a picked chip routes back through it at submit time. */
export declare const FAVORITES_SOURCE_NAME = "favorites";
/** Rows rendered for one query, at most. */
export declare const CANDIDATE_LIMIT = 50;
/**
 * Menu position among `@` sources. The menu lays groups out by ascending
 * `order`, and the file/session source (`ui-reference`) declares none (0), so
 * a negative value is what lifts saved prompts to the top of the `@` menu.
 */
export declare const FAVORITES_SOURCE_ORDER = -100;
/**
 * Build the saved-prompt trigger source.
 * @param state - current store snapshot, read per keystroke.
 * @param t - dictionary-bound translator.
 * @returns the source registered on `ctx.inputTriggers`.
 */
export declare function createFavoritesSource(state: () => FavoritesState, t: Translate): InputTriggerSource;
//# sourceMappingURL=source.d.ts.map