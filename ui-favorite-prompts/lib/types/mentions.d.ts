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
export declare const MAX_REFERENCES_PER_MESSAGE = 3;
/** One cited prompt, as much of it as either reader needs. */
export interface CitedPrompt {
    readonly name: string;
    readonly text: string;
}
/** Outcome of resolving one message's mentions. */
export interface MentionResolution {
    /** Cited names within the cap, in citation order; misses included. */
    names: string[];
    resolved: CitedPrompt[];
    unresolved: string[];
    /** Mentions beyond the per-message cap, left unlisted and unexpanded. */
    omitted: number;
}
/**
 * Collect the mention names one message text cites.
 * @param text - plain text of one user message.
 * @returns distinct names in order of first appearance.
 */
export declare function scanMentions(text: string): string[];
/**
 * Resolve mention names through a caller-supplied lookup.
 * @param names - names from {@link scanMentions}.
 * @param lookup - finds the cited prompt for a name, or `undefined` when none.
 * @returns hits, misses, and how many mentions the cap dropped.
 */
export declare function resolveMentions(names: readonly string[], lookup: (name: string) => CitedPrompt | undefined): MentionResolution;
//# sourceMappingURL=mentions.d.ts.map