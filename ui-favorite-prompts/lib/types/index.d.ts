/**
 * Favorite-prompts host half: opens the storage domain its records live in and
 * serves the browser half's same-origin route. A composition without a web
 * server has no browser half either, so the plugin stays inert there.
 */
import type { Context } from '@deepseek-ai/cordis';
/** Host plugin name. */
export declare const name = "favorite-prompts";
/**
 * Mount the domain and the route.
 * @param ctx - host context carrying `webServer` and `storageDomain`.
 */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map