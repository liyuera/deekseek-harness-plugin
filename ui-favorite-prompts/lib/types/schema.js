/**
 * Shared vocabulary of the favorite-prompts plugin: names, record types, and
 * HTTP bodies. Types only — the zod record schema lives in `domain.ts` so the
 * browser bundle never carries zod.
 */
/** Storage domain name; `UNIT_NAME_RE` forbids hyphens. */
export const PROMPT_DOMAIN = 'favorite_prompts';
/** Table holding one record per saved prompt. */
export const PROMPT_TABLE = 'prompts';
/** Same-origin HTTP route serving the browser half. */
export const PROMPT_ROUTE = '/favorite-prompts';
//# sourceMappingURL=schema.js.map