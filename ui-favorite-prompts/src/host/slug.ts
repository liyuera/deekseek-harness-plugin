/**
 * Mention names: the stable, whitespace-free identifier a saved prompt is cited
 * by. Minting belongs to the host half (one writer), so this module lives here
 * rather than in the shared vocabulary.
 */

/** Longest minted slug, in code points. */
export const SLUG_LIMIT = 24
/** Longest name a user may set by hand, in code points. */
export const NAME_LIMIT = 32

/** A name that survives the `@` mention grammar: letters, digits, CJK, hyphen. */
const NAME_RE = /^[\p{L}\p{N}-]+$/u

/** Characters a slug keeps. */
const KEEP_RE = /[\p{L}\p{N}-]/u

/**
 * Derive a mention name from prompt text: the first non-empty line, whitespace
 * folded to hyphens, everything but letters/digits/CJK dropped, truncated by
 * code point.
 * @param text - prompt text.
 * @param limit - longest slug in code points.
 * @returns the slug, or `prompt` when nothing survives.
 */
export function slugify(text: string, limit: number = SLUG_LIMIT): string {
  const firstLine = text.split('\n').find(line => line.trim() !== '') ?? text
  const kept = [...firstLine.trim().replace(/\s+/gu, '-')].filter(char => KEEP_RE.test(char)).join('')
  const collapsed = kept.replace(/-{2,}/gu, '-').replace(/^-+|-+$/gu, '')
  const sliced = [...collapsed].slice(0, limit).join('').replace(/-+$/gu, '')
  return sliced === '' ? 'prompt' : sliced
}

/**
 * Make one slug unique among the names already in use.
 * @param base - minted or requested slug.
 * @param taken - names that are already taken.
 * @returns a name absent from `taken`.
 */
export function uniqueName(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base
  for (let suffix = 2; ; suffix += 1) {
    const candidate = `${base}-${suffix}`
    if (!taken.has(candidate)) return candidate
  }
}

/**
 * Whether a hand-typed name is usable as a mention.
 * @param name - candidate name.
 * @returns true when it survives the mention grammar and the length limit.
 */
export function isValidName(name: string): boolean {
  const points = [...name]
  return points.length > 0 && points.length <= NAME_LIMIT && NAME_RE.test(name)
}
