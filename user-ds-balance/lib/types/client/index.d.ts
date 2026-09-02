/**
 * Browser half of the user DeepSeek balance plugin: registers the balance
 * readout into the composer tool row (`conversation.input.left`, beside the
 * access-mode control) and drives its poll/refresh cycle over the host
 * `/ds-balance` route.
 * @module @liyuera/dsh-user-ds-balance/client
 */
import type { Context } from '@deepseek-ai/cordis';
/** Required services: the slot registry. */
export declare const inject: string[];
/**
 * Mount the balance readout. The left tool row is a list seat (`id` addresses
 * the cell), so the entry is purely additive and disappears with the plugin.
 * @param ctx - Cordis browser context.
 */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map