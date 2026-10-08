/**
 * Prompt identity: the whitespace and encoding differences two copies of the
 * same prompt may carry. This is the single definition of "the same prompt";
 * the derived lookup index in the store is built from it, and nothing about it
 * is persisted (a stored hash would freeze the rule).
 */
/** Longest derived menu identity, in code points. */
export declare const CANDIDATE_NAME_LIMIT = 40;
/**
 * Fold the differences that do not change which prompt a text is: encoding
 * form, line endings, and every run of horizontal whitespace (each line's runs
 * become one space, and each line's ends are trimmed). Line structure is kept —
 * blank lines stay blank.
 * @param text - raw prompt or message text.
 * @returns the comparison form.
 */
export declare function normalizeText(text: string): string;
/**
 * Derive the short menu identity of one saved prompt.
 * @param text - saved prompt text.
 * @param taken - identities already used in the same menu.
 * @returns a unique identity within `taken`.
 */
export declare function candidateName(text: string, taken: ReadonlySet<string>): string;
/**
 * One-line preview for a menu row or a settings row.
 * @param text - saved prompt text.
 * @param limit - longest preview in code points.
 * @returns the flattened preview.
 */
export declare function previewText(text: string, limit?: number): string;
//# sourceMappingURL=normalize.d.ts.map