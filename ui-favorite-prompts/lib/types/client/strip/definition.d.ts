/**
 * Bookmark strip: one extra Chat node directly under each user message.
 *
 * ORDERING CONTRACT — the node key is `${kind.length}:${kind}${id}`, and the
 * Chat view orders equal anchors by that key's dictionary order (anchor → rank
 * → originalAnchor → key). The built-in user node is `13:input-message…`, so
 * this kind's 14-character name keeps every strip AFTER its message. Renaming
 * the kind, or moving `anchorSeq` off `event.seq`, moves the strip: a shorter
 * name sorts it above the bubble, and an anchor below the turn's
 * `openingHumanAnchor` folds it into the process group.
 */
import type { ConversationNodeDefinition } from '@deepseek-ai/dsh-client-ui-conversation/client';
/** Renderer dispatch key; see the ordering contract above before changing it. */
export declare const FAVORITE_STRIP_KIND = "favorite-strip";
/** Payload of one strip node. */
export interface FavoriteStripData {
    readonly text: string;
    readonly seq: number;
}
declare module '@deepseek-ai/dsh-client-ui-chat/client' {
    interface ChatNodeDataMap {
        /** Bookmark strip under one user message. */
        'favorite-strip': FavoriteStripData;
    }
}
/** One bookmark strip per user-authored message with visible text. */
export declare const favoriteStripDefinition: ConversationNodeDefinition<FavoriteStripData>;
//# sourceMappingURL=definition.d.ts.map