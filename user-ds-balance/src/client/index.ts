/**
 * Browser half of the user DeepSeek balance plugin: registers the balance
 * readout into the composer tool row (`conversation.input.left`, beside the
 * access-mode control) and drives its poll/refresh cycle over the host
 * `/ds-balance` route.
 * @module @liyuera/dsh-user-ds-balance/client
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import { BalanceFooter } from './BalanceFooter.tsx'

/** Required services: the slot registry. */
export const inject = ['slots']

/**
 * Mount the balance readout. The left tool row is a list seat (`id` addresses
 * the cell), so the entry is purely additive and disappears with the plugin.
 * @param ctx - Cordis browser context.
 */
export function apply(ctx: Context): void {
  ctx.slots.inject('conversation.input.left', () => ctx.slots.register({
    name: 'conversation.input.left',
    id: 'ds-balance',
    order: 100,
    label: '余额',
  }, BalanceFooter))
}
