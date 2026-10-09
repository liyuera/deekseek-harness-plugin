/**
 * devDock plugin v2, node half. Projects are dsh workspaces; this half
 * registers the `dev-dock` settings namespace and the desktop-action HTTP
 * route (`POST /dev-dock/action`) that the browser half calls for editor
 * detection and the desktop actions (open editor / system terminal /
 * start-work). Deterministic execution: no agent, no tools, no approval
 * prompt — the button click is the user's authorization. The only guard is
 * the sandbox mode: `read-only` denies desktop side effects.
 *
 * Transport note: static client bundles have no package-private RPC channel
 * (host.call is a dynamic-plugin builtin), so the browser half reaches the
 * host through a same-origin route on the loopback web server.
 * @module @liyuera/dsh-dev-dock
 */
import type { Context } from '@deepseek-ai/cordis';
/** Plugin identity. */
export declare const name = "dev-dock";
/**
 * Services required by the host half. `webServer` and `storageDomain` mount
 * later in the tree than this row, so they must be declared here: reading them
 * through `ctx.get` in `apply` would find an empty context and silently leave
 * every route and the document unregistered.
 */
export declare const inject: string[];
/**
 * Register the document domain, the state route, and the desktop-action routes.
 * @param ctx - Cordis context carrying the web server, the storage facility, the
 * workspace registry, and the sandbox policy.
 */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map