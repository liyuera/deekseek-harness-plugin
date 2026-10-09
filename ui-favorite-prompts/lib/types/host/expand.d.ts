/**
 * Mention expansion: a user message that cites saved prompts gets one context
 * message carrying their text, placed immediately after it.
 *
 * The scan and the resolution rules live in `src/mentions.ts` because the
 * transcript's citation line reads the same list.
 */
import type { CitedPrompt, MentionResolution } from '../mentions.ts';
import { resolveMentions, scanMentions } from '../mentions.ts';
import type { PromptRecord } from '../schema.ts';
export { resolveMentions, scanMentions };
export type { CitedPrompt, MentionResolution };
/**
 * Resolve one message's mentions against the saved-prompt records.
 * @param text - plain text of one user message.
 * @param records - every saved prompt the host holds.
 * @returns hits, misses, and how many mentions the cap dropped.
 */
export declare function resolveMessageMentions(text: string, records: readonly PromptRecord[]): MentionResolution;
/**
 * Render the context message that carries referenced prompt text.
 * @param resolved - prompts whose names matched.
 * @param unresolved - names that matched nothing.
 * @param omitted - mentions the cap left unexpanded.
 * @returns the message text, prompt bodies verbatim.
 */
export declare function renderReferenceContext(resolved: readonly CitedPrompt[], unresolved: readonly string[], omitted?: number): string;
//# sourceMappingURL=expand.d.ts.map