/**
 * One bookmark strip under a user message: the citation line for saved prompts
 * this message cites, plus the bookmark action with an inline undo window.
 */
import { type ReactNode } from 'react';
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store';
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { FavoritesActions, FavoritesState } from '../store.ts';
import { NS } from '../locales.ts';
/** How long the inline undo stays available, in ms. */
export declare const UNDO_WINDOW_MS = 5000;
/** Business face injected into the strip registration. */
export interface FavoriteStripInjected {
    hooks: {
        favorites: SnapshotStore<FavoritesState>;
    };
    actions: FavoritesActions;
}
/** Composed props of the strip component. */
export type FavoriteStripProps = PropsRuntime<'conversation.chat.node', 'favorite-strip'> & PropsLocale<typeof NS> & InjectFace<FavoriteStripInjected>;
/**
 * Render the bookmark strip for one message.
 * @param props - node payload, session id, favorites hook and actions, copy.
 * @returns the strip row.
 */
export declare function FavoriteStrip({ node, sessionId, useFavorites, actions, t }: FavoriteStripProps): ReactNode;
//# sourceMappingURL=FavoriteStrip.d.ts.map