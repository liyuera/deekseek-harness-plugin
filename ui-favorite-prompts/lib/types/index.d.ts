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
 * Mount the domain, name any records that predate mentions, expand `@name`
 * citations in user messages, and serve the browser half's route.
 *
 * Both services are declared in `inject`: the profile mounts their providers
 * after this row, so reading the context at activate time would find nothing and
 * leave the plugin inert for the rest of the process.
 * @param ctx - host context carrying `storageDomain` and `webServer`.
 */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map