/**
 * The mention grammar, in one place.
 *
 * A user message cites saved prompts as bare `@name` tokens. Three readers share
 * this module so they can never drift apart: the bubble decorator's shape rule
 * (harness side, mirrored by construction), the host that expands citations into
 * context, and the transcript's citation line. What looks like a chip is what
 * expands, and what expands is what the line lists.
 */
/** Most references expanded from one message, and listed by the citation line. */
export const MAX_REFERENCES_PER_MESSAGE = 3;
/** Sentence punctuation a bare mention may carry without being part of the name. */
const TRAILING_PUNCTUATION_RE = /[.,;:!?，。；：！？]+$/u;
/** The boundary rule the bubble decorator uses: `@token` at start or after whitespace. */
const MENTION_RE = /(^|\s)@([^\s]+)/gu;
/**
 * Collect the mention names one message text cites.
 * @param text - plain text of one user message.
 * @returns distinct names in order of first appearance.
 */
export function scanMentions(text) {
    const names = [];
    MENTION_RE.lastIndex = 0;
    let match;
    while ((match = MENTION_RE.exec(text)) !== null) {
        const raw = match[2];
        // `@"quoted"` and anything carrying a slash belong to the file/directory
        // mention grammar, never to a saved-prompt name.
        if (raw.startsWith('"'))
            continue;
        const name = raw.replace(TRAILING_PUNCTUATION_RE, '');
        if (name === '' || name.includes('/') || names.includes(name))
            continue;
        names.push(name);
    }
    return names;
}
/**
 * Resolve mention names through a caller-supplied lookup.
 * @param names - names from {@link scanMentions}.
 * @param lookup - finds the cited prompt for a name, or `undefined` when none.
 * @returns hits, misses, and how many mentions the cap dropped.
 */
export function resolveMentions(names, lookup) {
    const capped = names.slice(0, MAX_REFERENCES_PER_MESSAGE);
    const resolved = [];
    const unresolved = [];
    for (const name of capped) {
        const found = lookup(name);
        if (found === undefined)
            unresolved.push(name);
        else
            resolved.push(found);
    }
    return { names: [...capped], resolved, unresolved, omitted: names.length - capped.length };
}
//# sourceMappingURL=mentions.js.map