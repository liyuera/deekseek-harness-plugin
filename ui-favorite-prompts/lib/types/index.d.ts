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
 * Mount the domain, name any records that predate mentions, and serve the
 * browser half's route. The domain and the mention expansion are independent of
 * the web server, so a composition without one still cites saved prompts.
 * @param ctx - host context carrying `storageDomain` (and `webServer` for the route).
 */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map