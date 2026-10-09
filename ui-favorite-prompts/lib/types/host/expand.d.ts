/**
 * Mention expansion: a user message that cites saved prompts gets one context
 * message carrying their text, placed immediately after it.
 *
 * The scan mirrors the transcript's chip decorator on purpose — what reads as a
 * chip in the bubble is what expands for the model.
 */
import type { PromptRecord } from '../schema.ts';
/** Most references expanded from one message. */
export declare const MAX_REFERENCES_PER_MESSAGE = 3;
/**
 * Collect the mention names one message text cites.
 * @param text - plain text of one user message.
 * @returns distinct names in order of first appearance.
 */
export declare function scanMentions(text: string): string[];
/** Outcome of resolving one message's mentions. */
export interface ResolvedMentions {
    resolved: PromptRecord[];
    unresolved: string[];
    /** Mentions beyond the per-message cap, left unexpanded. */
    omitted: number;
}
/**
 * Resolve mention names against the saved-prompt records.
 * @param names - names from {@link scanMentions}.
 * @param records - every saved prompt the host holds.
 * @returns hits, misses, and how many mentions the cap dropped.
 */
export declare function resolveMentions(names: readonly string[], records: readonly PromptRecord[]): ResolvedMentions;
/**
 * Render the context message that carries referenced prompt text.
 * @param resolved - records whose names matched.
 * @param unresolved - names that matched nothing.
 * @param omitted - mentions the cap left unexpanded.
 * @returns the message text, prompt bodies verbatim.
 */
export declare function renderReferenceContext(resolved: readonly PromptRecord[], unresolved: readonly string[], omitted?: number): string;
//# sourceMappingURL=expand.d.ts.map