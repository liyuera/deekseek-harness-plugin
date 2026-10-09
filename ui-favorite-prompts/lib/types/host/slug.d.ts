/**
 * Mention names: the stable, whitespace-free identifier a saved prompt is cited
 * by. Minting belongs to the host half (one writer), so this module lives here
 * rather than in the shared vocabulary.
 */
/** Longest minted slug, in code points. */
export declare const SLUG_LIMIT = 24;
/** Longest name a user may set by hand, in code points. */
export declare const NAME_LIMIT = 32;
/**
 * Derive a mention name from prompt text: the first non-empty line, whitespace
 * folded to hyphens, everything but letters/digits/CJK dropped, truncated by
 * code point.
 * @param text - prompt text.
 * @param limit - longest slug in code points.
 * @returns the slug, or `prompt` when nothing survives.
 */
export declare function slugify(text: string, limit?: number): string;
/**
 * Make one slug unique among the names already in use.
 * @param base - minted or requested slug.
 * @param taken - names that are already taken.
 * @returns a name absent from `taken`.
 */
export declare function uniqueName(base: string, taken: ReadonlySet<string>): string;
/**
 * Whether a hand-typed name is usable as a mention.
 * @param name - candidate name.
 * @returns true when it survives the mention grammar and the length limit.
 */
export declare function isValidName(name: string): boolean;
//# sourceMappingURL=slug.d.ts.map