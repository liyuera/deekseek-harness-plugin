window.__ModuleLoader__.load({
	id: "@liyuera/dsh-user-ds-balance",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		//#region \0dsh-css:/Users/liyu/Documents/www/DeepSeek/deepseek-harness/deepseek-harness-plugin/user-ds-balance/src/client/BalanceFooter.module.css.mjs
		const css = ".x_I3kq_cell{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-button-elevated-fill);height:28px;color:var(--dsw-alias-label-primary);white-space:nowrap;cursor:pointer;border-radius:8px;justify-content:center;align-items:center;gap:5px;margin:0 2px;padding:0 8px;font-size:12px;font-weight:500;line-height:1;display:inline-flex}.x_I3kq_cell:hover{background:var(--dsw-alias-button-floating-hover)}.x_I3kq_cell:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}.x_I3kq_cell[data-loading]{opacity:.7}.x_I3kq_money{align-items:center;display:inline-flex}.x_I3kq_spinner{border:1.5px solid;border-top-color:#0000;border-radius:50%;flex:none;width:10px;height:10px;animation:.8s linear infinite x_I3kq_ds-balance-spin}@keyframes x_I3kq_ds-balance-spin{to{transform:rotate(360deg)}}@media (prefers-reduced-motion:reduce){.x_I3kq_spinner{animation:none}}";
		const tagId = "@liyuera/dsh-user-ds-balance/BalanceFooter.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@liyuera/dsh-user-ds-balance";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var BalanceFooter_module_css_default = {
			"cell": "x_I3kq_cell",
			"ds-balance-spin": "x_I3kq_ds-balance-spin",
			"money": "x_I3kq_money",
			"spinner": "x_I3kq_spinner"
		};
		//#endregion
		//#region lib/types/client/BalanceFooter.js
		/**
		* Composer-row balance readout: a compact red amount pill beside the
		* access-mode control. Clicking triggers an immediate refresh independent of
		* the 5-minute poll cycle (both share only the in-flight counter that drives
		* the loading indicator).
		*/
		const POLL_INTERVAL_MS = 3e5;
		function parsePayload(value) {
			if (typeof value !== "object" || value === null) return {};
			const record = value;
			return {
				...typeof record.ok === "boolean" ? { ok: record.ok } : {},
				...typeof record.error === "string" ? { error: record.error } : {},
				...typeof record.available === "boolean" ? { available: record.available } : {},
				...typeof record.currency === "string" ? { currency: record.currency } : {},
				...typeof record.totalBalance === "string" ? { totalBalance: record.totalBalance } : {}
			};
		}
		/** Render one composer-row balance cell. */
		function BalanceFooter(_props) {
			const [view, setView] = (0, react.useState)({
				loading: false,
				data: void 0,
				error: void 0
			});
			const inFlight = (0, react.useRef)(0);
			const refresh = () => {
				inFlight.current += 1;
				setView((current) => ({
					...current,
					loading: true
				}));
				fetch("/ds-balance", { headers: { Accept: "application/json" } }).then(async (response) => {
					const payload = parsePayload(await response.json());
					inFlight.current -= 1;
					const ok = payload.ok === true;
					setView((current) => ({
						...current,
						loading: inFlight.current > 0,
						data: ok ? payload : current.data,
						error: ok ? void 0 : String(payload.error ?? "查询失败")
					}));
				}).catch((error) => {
					inFlight.current -= 1;
					setView((current) => ({
						...current,
						loading: inFlight.current > 0,
						error: error instanceof Error ? error.message : String(error)
					}));
				});
			};
			(0, react.useEffect)(() => {
				refresh();
				const id = window.setInterval(refresh, POLL_INTERVAL_MS);
				return () => {
					window.clearInterval(id);
				};
			}, []);
			const data = view.data;
			const amount = data === void 0 ? void 0 : `${data.currency === "USD" ? "$" : "¥"}${data.totalBalance ?? ""}`;
			const title = view.error === void 0 ? amount === void 0 ? "DeepSeek 余额查询中" : `DeepSeek 余额 ${amount} · 点击刷新` : `DeepSeek 余额查询失败：${view.error}`;
			return (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				className: BalanceFooter_module_css_default.cell,
				"data-loading": view.loading || void 0,
				"aria-label": amount === void 0 ? "DeepSeek 余额" : `DeepSeek 余额 ${amount}`,
				title,
				onClick: refresh,
				children: [(0, react_jsx_runtime.jsx)("span", {
					className: BalanceFooter_module_css_default.money,
					children: amount === void 0 ? "--" : amount
				}), view.loading ? (0, react_jsx_runtime.jsx)("span", {
					className: BalanceFooter_module_css_default.spinner,
					"aria-hidden": true
				}) : null]
			});
		}
		//#endregion
		//#region lib/types/client/index.js
		/**
		* Browser half of the user DeepSeek balance plugin: registers the balance
		* readout into the composer tool row (`conversation.input.left`, beside the
		* access-mode control) and drives its poll/refresh cycle over the host
		* `/ds-balance` route.
		* @module @liyuera/dsh-user-ds-balance/client
		*/
		/** Required services: the slot registry. */
		const inject = ["slots"];
		/**
		* Mount the balance readout. The left tool row is a list seat (`id` addresses
		* the cell), so the entry is purely additive and disappears with the plugin.
		* @param ctx - Cordis browser context.
		*/
		function apply(ctx) {
			ctx.slots.inject("conversation.input.left", () => ctx.slots.register({
				name: "conversation.input.left",
				id: "ds-balance",
				order: 100,
				label: "余额"
			}, BalanceFooter));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map