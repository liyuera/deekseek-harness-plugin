import { isAppendSurfaceEvent } from '@deepseek-ai/dsh-session/surface';
/** Renderer dispatch key; see the ordering contract above before changing it. */
export const FAVORITE_STRIP_KIND = 'favorite-strip';
/**
 * Join the text blocks of one message the way the built-in copy action does,
 * so the saved text is exactly what the user sees.
 * @param content - message content blocks.
 * @returns the joined plain text.
 */
function messageText(content) {
    if (!Array.isArray(content))
        return '';
    const texts = [];
    for (const block of content) {
        const candidate = block;
        if (candidate.type === 'text' && typeof candidate.text === 'string')
            texts.push(candidate.text);
    }
    return texts.join('');
}
/** One bookmark strip per user-authored message with visible text. */
export const favoriteStripDefinition = {
    kind: FAVORITE_STRIP_KIND,
    target: 'chat',
    match: (event) => {
        if (event.type !== 'user/message' || !isAppendSurfaceEvent(event))
            return null;
        if (event.data.source.kind !== 'user')
            return null;
        const text = messageText(event.data.content);
        return text.trim() === '' ? null : { id: String(event.data.id), role: 'start' };
    },
    start: (_context, match) => {
        if (match.event.type !== 'user/message')
            throw new Error('favorite-strip start requires user/message');
        return { text: messageText(match.event.data.content), seq: match.event.seq };
    },
    update: context => context.state,
    buildViewNode: (context) => {
        if (context.state === undefined || context.start === undefined)
            return null;
        const location = context.start.location;
        return {
            key: context.key,
            kind: FAVORITE_STRIP_KIND,
            id: context.id,
            target: 'chat',
            anchorSeq: context.start.event.seq,
            location,
            visibility: 'visible',
            data: context.state,
        };
    },
};
//# sourceMappingURL=definition.js.map