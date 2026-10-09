/**
 * Prompt identity: the whitespace and encoding differences two copies of the
 * same prompt may carry. This is the single definition of "the same prompt";
 * the derived lookup index in the store is built from it, and nothing about it
 * is persisted (a stored hash would freeze the rule).
 */

/** Longest derived menu identity, in code points. */
export const CANDIDATE_NAME_LIMIT = 40

/**
 * Fold the differences that do not change which prompt a text is: encoding
 * form, line endings, and every run of horizontal whitespace (each line's runs
 * become one space, and each line's ends are trimmed). Line structure is kept —
 * blank lines stay blank.
 * @param text - raw prompt or message text.
 * @returns the comparison form.
 */
export function normalizeText(text: string): string {
  return text
    .normalize('NFC')
    .replace(/\r\n?/gu, '\n')
    .split('\n')
    .map(line => line.replace(/[ \t]+/gu, ' ').trim())
    .join('\n')
    .trim()
}

/**
 * Derive the short menu identity of one saved prompt.
 * @param text - saved prompt text.
 * @param taken - identities already used in the same menu.
 * @returns a unique identity within `taken`.
 */
export function candidateName(text: string, taken: ReadonlySet<string>): string {
  const firstLine = text.split('\n').find(line => line.trim() !== '') ?? text
  const trimmed = firstLine.trim()
  const base = [...trimmed].slice(0, CANDIDATE_NAME_LIMIT).join('') || trimmed
  if (!taken.has(base)) return base
  for (let n = 2; ; n += 1) {
    const candidate = `${base} (${n})`
    if (!taken.has(candidate)) return candidate
  }
}

/**
 * One-line preview for a menu row or a settings row.
 * @param text - saved prompt text.
 * @param limit - longest preview in code points.
 * @returns the flattened preview.
 */
export function previewText(text: string, limit = 80): string {
  const flat = normalizeText(text).replace(/\n+/gu, ' ')
  const points = [...flat]
  return points.length <= limit ? flat : `${points.slice(0, limit).join('')}…`
}
