/**
 * Node half of the user DeepSeek balance plugin: an exact `/ds-balance` HTTP
 * route over the host `webServer` that resolves `DEEPSEEK_API_KEY` through the
 * `credentials` service (per operation, never cached), calls the official
 * DeepSeek balance API, and answers the browser with a small JSON payload.
 * @module @liyuera/dsh-user-ds-balance
 */
import type { Context } from '@deepseek-ai/cordis';
/** Server-only dependency; the route is the plugin's whole host behavior. */
export declare const inject: string[];
/**
 * Register the balance endpoint. The path deliberately stays outside the
 * `/api` prefix because `client-connection` claims that whole prefix for its
 * trusted RPC gateway.
 * @param ctx - Cordis context with the web server service.
 */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map