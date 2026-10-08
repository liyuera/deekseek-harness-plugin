/**
 * Favorite-prompts host half: opens the storage domain its records live in and
 * serves the browser half's same-origin route. A composition without a web
 * server has no browser half either, so the plugin stays inert there.
 */
import type { Context } from '@deepseek-ai/cordis';
/** Host plugin name. */
export declare const name = "favorite-prompts";
/**
 * Services the host half needs. Both arrive from plugins that mount later in
 * the tree than this row, so `apply` runs when they land instead of reading
 * an empty context and staying inert for the rest of the process.
 */
export declare const inject: string[];
/**
 * Mount the domain and the route.
 * @param ctx - host context carrying `webServer` and `storageDomain`.
 */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map