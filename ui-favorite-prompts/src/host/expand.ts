/**
 * Mention expansion: a user message that cites saved prompts gets one context
 * message carrying their text, placed immediately after it.
 *
 * The scan mirrors the transcript's chip decorator on purpose — what reads as a
 * chip in the bubble is what expands for the model.
 */
import type { PromptRecord } from '../schema.ts'

/** Most references expanded from one message. */
export const MAX_REFERENCES_PER_MESSAGE = 3

/** Sentence punctuation a bare mention may carry without being part of the name. */
const TRAILING_PUNCTUATION_RE = /[.,;:!?，。；：！？]+$/u

/** The boundary rule the bubble decorator uses: `@token` at start or after whitespace. */
const MENTION_RE = /(^|\s)@([^\s]+)/gu

/** Heading of the injected context message. */
const HEADER = '## Referenced saved prompts'
/** Why the model is reading this, and how to treat it. */
const NOTE = "The user's message cites saved prompts. Each prompt below is the user's own saved "
  + 'text: treat it as part of their instruction.'
/** What an unresolvable mention means. */
const UNRESOLVED = 'Unresolved: no saved prompt has this name. It may have been renamed or '
  + 'deleted; ask the user which prompt they meant.'

/**
 * Collect the mention names one message text cites.
 * @param text - plain text of one user message.
 * @returns distinct names in order of first appearance.
 */
export function scanMentions(text: string): string[] {
  const names: string[] = []
  MENTION_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = MENTION_RE.exec(text)) !== null) {
    const raw = match[2] as string
    // `@"quoted"` and anything carrying a slash belong to the file/directory
    // mention grammar, never to a saved-prompt name.
    if (raw.startsWith('"')) continue
    const name = raw.replace(TRAILING_PUNCTUATION_RE, '')
    if (name === '' || name.includes('/') || names.includes(name)) continue
    names.push(name)
  }
  return names
}

/** Outcome of resolving one message's mentions. */
export interface ResolvedMentions {
  resolved: PromptRecord[]
  unresolved: string[]
  /** Mentions beyond the per-message cap, left unexpanded. */
  omitted: number
}

/**
 * Resolve mention names against the saved-prompt records.
 * @param names - names from {@link scanMentions}.
 * @param records - every saved prompt the host holds.
 * @returns hits, misses, and how many mentions the cap dropped.
 */
export function resolveMentions(
  names: readonly string[],
  records: readonly PromptRecord[],
): ResolvedMentions {
  const capped = names.slice(0, MAX_REFERENCES_PER_MESSAGE)
  const byName = new Map<string, PromptRecord>()
  for (const record of records) {
    if (record.name !== undefined) byName.set(record.name, record)
  }
  const resolved: PromptRecord[] = []
  const unresolved: string[] = []
  for (const name of capped) {
    const record = byName.get(name)
    if (record === undefined) unresolved.push(name)
    else resolved.push(record)
  }
  return { resolved, unresolved, omitted: names.length - capped.length }
}

/**
 * Render the context message that carries referenced prompt text.
 * @param resolved - records whose names matched.
 * @param unresolved - names that matched nothing.
 * @param omitted - mentions the cap left unexpanded.
 * @returns the message text, prompt bodies verbatim.
 */
export function renderReferenceContext(
  resolved: readonly PromptRecord[],
  unresolved: readonly string[],
  omitted: number = 0,
): string {
  const parts: string[] = [HEADER, '', NOTE]
  for (const record of resolved) parts.push('', `### @${record.name ?? ''}`, '', record.text)
  for (const name of unresolved) parts.push('', `### @${name}`, '', UNRESOLVED)
  if (omitted > 0) parts.push('', `${omitted} further mention(s) were not expanded.`)
  return parts.join('\n')
}
