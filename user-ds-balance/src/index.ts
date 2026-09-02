/**
 * Node half of the user DeepSeek balance plugin: an exact `/ds-balance` HTTP
 * route over the host `webServer` that resolves `DEEPSEEK_API_KEY` through the
 * `credentials` service (per operation, never cached), calls the official
 * DeepSeek balance API, and answers the browser with a small JSON payload.
 * @module @liyuera/dsh-user-ds-balance
 */

import type { Context } from '@deepseek-ai/cordis'
import type { CredentialRef } from '@deepseek-ai/dsh-credentials'
// Empty type imports carry the webServer/credentials Context merges.
import type {} from '@deepseek-ai/dsh-host-webserver'
import type {} from '@deepseek-ai/dsh-credentials'

/** Server-only dependency; the route is the plugin's whole host behavior. */
export const inject = ['webServer']

const BALANCE_URL = 'https://api.deepseek.com/user/balance'

/**
 * Register the balance endpoint. The path deliberately stays outside the
 * `/api` prefix because `client-connection` claims that whole prefix for its
 * trusted RPC gateway.
 * @param ctx - Cordis context with the web server service.
 */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/ds-balance',
    handler: async (_request, res) => {
      const respond = (payload: unknown): void => {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify(payload))
      }
      try {
        const credentials = ctx.get('credentials')
        const resolved = credentials === undefined
          ? undefined
          : await credentials.resolve('DEEPSEEK_API_KEY' as CredentialRef)
        if (resolved === undefined || resolved.value.length === 0) {
          respond({ ok: false, error: '未配置 DEEPSEEK_API_KEY' })
          return
        }
        const response = await fetch(BALANCE_URL, {
          headers: {
            Authorization: `Bearer ${resolved.value}`,
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(15000),
        })
        if (!response.ok) {
          respond({ ok: false, error: `余额请求失败 (HTTP ${response.status})` })
          return
        }
        const payload = await response.json() as {
          is_available?: unknown
          balance_infos?: Array<Record<string, unknown>>
        }
        const info = Array.isArray(payload.balance_infos) ? payload.balance_infos[0] : undefined
        if (info === undefined) {
          respond({ ok: false, error: '余额响应缺少 balance_infos' })
          return
        }
        respond({
          ok: true,
          available: payload.is_available === true,
          currency: String(info.currency ?? 'CNY'),
          totalBalance: String(info.total_balance ?? ''),
          grantedBalance: String(info.granted_balance ?? ''),
          toppedUpBalance: String(info.topped_up_balance ?? ''),
          fetchedAt: Date.now(),
        })
      } catch (error) {
        respond({ ok: false, error: error instanceof Error ? error.message : String(error) })
      }
    },
  }), 'user-ds-balance: /ds-balance route')
}
