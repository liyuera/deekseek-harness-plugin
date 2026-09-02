//#region lib/types/index.js
/**
* Node half of the user DeepSeek balance plugin: an exact `/ds-balance` HTTP
* route over the host `webServer` that resolves `DEEPSEEK_API_KEY` through the
* `credentials` service (per operation, never cached), calls the official
* DeepSeek balance API, and answers the browser with a small JSON payload.
* @module @liyuera/dsh-user-ds-balance
*/
/** Server-only dependency; the route is the plugin's whole host behavior. */
const inject = ["webServer"];
const BALANCE_URL = "https://api.deepseek.com/user/balance";
/**
* Register the balance endpoint. The path deliberately stays outside the
* `/api` prefix because `client-connection` claims that whole prefix for its
* trusted RPC gateway.
* @param ctx - Cordis context with the web server service.
*/
function apply(ctx) {
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/ds-balance",
		handler: async (_request, res) => {
			const respond = (payload) => {
				res.writeHead(200, { "content-type": "application/json" });
				res.end(JSON.stringify(payload));
			};
			try {
				const credentials = ctx.get("credentials");
				const resolved = credentials === void 0 ? void 0 : await credentials.resolve("DEEPSEEK_API_KEY");
				if (resolved === void 0 || resolved.value.length === 0) {
					respond({
						ok: false,
						error: "未配置 DEEPSEEK_API_KEY"
					});
					return;
				}
				const response = await fetch(BALANCE_URL, {
					headers: {
						Authorization: `Bearer ${resolved.value}`,
						Accept: "application/json"
					},
					signal: AbortSignal.timeout(15e3)
				});
				if (!response.ok) {
					respond({
						ok: false,
						error: `余额请求失败 (HTTP ${response.status})`
					});
					return;
				}
				const payload = await response.json();
				const info = Array.isArray(payload.balance_infos) ? payload.balance_infos[0] : void 0;
				if (info === void 0) {
					respond({
						ok: false,
						error: "余额响应缺少 balance_infos"
					});
					return;
				}
				respond({
					ok: true,
					available: payload.is_available === true,
					currency: String(info.currency ?? "CNY"),
					totalBalance: String(info.total_balance ?? ""),
					grantedBalance: String(info.granted_balance ?? ""),
					toppedUpBalance: String(info.topped_up_balance ?? ""),
					fetchedAt: Date.now()
				});
			} catch (error) {
				respond({
					ok: false,
					error: error instanceof Error ? error.message : String(error)
				});
			}
		}
	}), "user-ds-balance: /ds-balance route");
}
//#endregion
export { apply, inject };
