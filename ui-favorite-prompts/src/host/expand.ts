/**
 * Mention expansion: a user message that cites saved prompts gets one context
 * message carrying their text, placed immediately after it.
 *
 * The scan and the resolution rules live in `src/mentions.ts` because the
 * transcript's citation line reads the same list.
 */
import type { CitedPrompt, MentionResolution } from '../mentions.ts'
import { resolveMentions, scanMentions } from '../mentions.ts'
import type { PromptRecord } from '../schema.ts'

/** Heading of the injected context message. */
const HEADER = '## Referenced saved prompts'
/** Why the model is reading this, and how to treat it. */
const NOTE = "The user's message cites saved prompts. Each prompt below is the user's own saved "
  + 'text: treat it as part of their instruction.'
/** What an unresolvable mention means. */
const UNRESOLVED = 'Unresolved: no saved prompt has this name. It may have been renamed or '
  + 'deleted; ask the user which prompt they meant.'

export { resolveMentions, scanMentions }
export type { CitedPrompt, MentionResolution }

/**
 * Resolve one message's mentions against the saved-prompt records.
 * @param text - plain text of one user message.
 * @param records - every saved prompt the host holds.
 * @returns hits, misses, and how many mentions the cap dropped.
 */
export function resolveMessageMentions(
  text: string,
  records: readonly PromptRecord[],
): MentionResolution {
  const byName = new Map<string, CitedPrompt>()
  for (const record of records) {
    if (record.name !== undefined) byName.set(record.name, { name: record.name, text: record.text })
  }
  return resolveMentions(scanMentions(text), name => byName.get(name))
}

/**
 * Render the context message that carries referenced prompt text.
 * @param resolved - prompts whose names matched.
 * @param unresolved - names that matched nothing.
 * @param omitted - mentions the cap left unexpanded.
 * @returns the message text, prompt bodies verbatim.
 */
export function renderReferenceContext(
  resolved: readonly CitedPrompt[],
  unresolved: readonly string[],
  omitted: number = 0,
): string {
  const parts: string[] = [HEADER, '', NOTE]
  for (const record of resolved) parts.push('', `### @${record.name}`, '', record.text)
  for (const name of unresolved) parts.push('', `### @${name}`, '', UNRESOLVED)
  if (omitted > 0) parts.push('', `${omitted} further mention(s) were not expanded.`)
  return parts.join('\n')
}
