window.__ModuleLoader__.load({
	id: "@liuyera/dsh-chrome-browser",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let react = require("react");
		react = __toESM(react, 1);
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		//#region lib/client/chrome-icon.js
		/** Embedded copy of the user-provided Chrome icon (Google Chrome.png at the plugin root, 512px). */
		const CHROME_ICON_SRC = "data:image/png;base64,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";
		//#endregion
		//#region lib/client/TabPicker.js
		/**
		* Browser tab selector for the composer dock (the full-width row above the
		* input card). Multi-select; the platform select-style list (same surface /
		* text / hover tokens as the settings agent-preset picker) is rendered with
		* a fixed height and internal scroll, anchored to its trigger (opens
		* upward). The input box is never touched and no message content is
		* modified: the whole selection is bound host-side per session and reported
		* to the model through chrome_tabs (`session.tabs`); the tool default is the
		* first selected tab.
		* @module @liuyera/dsh-chrome-browser/client/tab-picker
		*/
		/** Fixed list height with internal scroll; width follows the dock card. */
		const LIST_HEIGHT = 340;
		/** Plugin-owned list stylesheet (component-scoped, inserted once). */
		const STYLE_ID = "dsh-chrome-browser-tab-list";
		const LIST_CSS = `
.cb-tab-list {
  box-sizing: border-box;
  background: var(--dsw-specific-tip);
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 12px;
  box-shadow: 0 8px 30px #0005;
  padding: 4px;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.cb-tab-list .cb-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 34px;
  padding: 5px 8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  line-height: 20px;
  color: var(--dsw-alias-label-primary);
  text-align: left;
}
.cb-tab-list .cb-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
.cb-tab-list .cb-row.cb-selected { background: var(--dsw-alias-interactive-bg-hover); }
.cb-tab-list .cb-row.cb-disabled { opacity: 0.4; cursor: not-allowed; }
.cb-tab-list .cb-title { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cb-tab-list .cb-check { flex: none; }
.cb-tab-list { scrollbar-width: none; }
.cb-tab-list::-webkit-scrollbar { display: none; }
`;
		/** Hide a broken favicon image (onError handler). */
		function hideBrokenIcon(event) {
			event.currentTarget.style.display = "none";
		}
		/** First letter of a title/url as the favicon fallback glyph. */
		function fallbackGlyph(tab) {
			const source = (tab.title || tab.url).trim();
			return source === "" ? "🌐" : Array.from(source)[0] ?? "🌐";
		}
		/** One 16px favicon with a text fallback when the image cannot load. */
		function Favicon({ url, fallback }) {
			if (url === void 0 || url === "") return react.default.createElement("span", { style: {
				width: 16,
				textAlign: "center",
				fontSize: 11
			} }, fallback);
			return react.default.createElement("img", {
				src: url,
				width: 16,
				height: 16,
				style: {
					borderRadius: 3,
					objectFit: "contain"
				},
				onError: hideBrokenIcon,
				referrerPolicy: "no-referrer"
			});
		}
		/** Google Chrome app icon (the user-provided PNG, embedded as a data URI). */
		function ChromeIcon({ size }) {
			return react.default.createElement("img", {
				src: CHROME_ICON_SRC,
				width: size,
				height: size,
				"aria-hidden": true,
				style: {
					borderRadius: 3,
					objectFit: "contain"
				}
			});
		}
		/** Fixed-position the list above the card, exactly as wide as the card, clamped 12px. */
		function listPosition(card) {
			const margin = 12;
			const vw = window.innerWidth;
			const vh = window.innerHeight;
			const rect = card?.getBoundingClientRect() ?? {
				left: vw / 2,
				top: vh / 2,
				right: vw / 2,
				width: 400
			};
			const width = Math.min(rect.width, vw - 24);
			const height = Math.min(LIST_HEIGHT, vh - 24);
			return {
				left: Math.min(Math.max(rect.left, margin), vw - width - margin),
				top: Math.min(Math.max(rect.top - height - 14, margin), vh - height - margin),
				width
			};
		}
		/**
		* The dock tab selector: chips for the selected tabs (multi), a fixed-height
		* scrollable list anchored to the card. Selection is bound host-side only.
		* @param props - session identity.
		*/
		function TabPicker(props) {
			const [tabs, setTabs] = react.default.useState(null);
			const [selectedIds, setSelectedIds] = react.default.useState([]);
			const [error, setError] = react.default.useState(void 0);
			const [open, setOpen] = react.default.useState(false);
			const [position, setPosition] = react.default.useState(null);
			const cardRef = react.default.useRef(null);
			const listRef = react.default.useRef(null);
			const selectedTabs = (tabs ?? []).filter((tab) => selectedIds.includes(tab.id));
			react.default.useEffect(() => {
				if (document.getElementById(STYLE_ID) !== null) return;
				const style = document.createElement("style");
				style.id = STYLE_ID;
				style.textContent = LIST_CSS;
				document.head.appendChild(style);
				return () => {
					document.getElementById(STYLE_ID)?.remove();
				};
			}, []);
			const refresh = react.default.useCallback(async () => {
				setError(void 0);
				setTabs(null);
				try {
					const body = await (await fetch("/chrome-browser/tabs", { method: "POST" })).json();
					if (body.ok !== true) {
						setError(body.error ?? "无法列出标签页");
						return;
					}
					setTabs(body.tabs ?? []);
				} catch (caught) {
					setError(String(caught));
				}
			}, []);
			const loadState = react.default.useCallback(async () => {
				try {
					const body = await (await fetch(`/chrome-browser/state?sessionId=${encodeURIComponent(props.sessionId)}`)).json();
					if (body.ok === true && body.selected !== null && body.selected !== void 0) setSelectedIds(Array.isArray(body.selected.tabIds) && body.selected.tabIds.length > 0 ? body.selected.tabIds : [body.selected.tabId]);
				} catch {}
			}, [props.sessionId]);
			react.default.useEffect(() => {
				setSelectedIds([]);
				loadState();
				refresh();
			}, [loadState, refresh]);
			react.default.useEffect(() => {
				if (!open) {
					setPosition(null);
					return;
				}
				const place = () => setPosition(listPosition(cardRef.current));
				place();
				window.addEventListener("resize", place);
				window.addEventListener("scroll", place, true);
				return () => {
					window.removeEventListener("resize", place);
					window.removeEventListener("scroll", place, true);
				};
			}, [open]);
			react.default.useEffect(() => {
				if (!open) return;
				const onDown = (event) => {
					const target = event.target;
					if (target === null) return;
					if (cardRef.current?.contains(target) === true) return;
					if (listRef.current?.contains(target) === true) return;
					setOpen(false);
				};
				const onKey = (event) => {
					if (event.key === "Escape") setOpen(false);
				};
				document.addEventListener("mousedown", onDown);
				document.addEventListener("keydown", onKey);
				return () => {
					document.removeEventListener("mousedown", onDown);
					document.removeEventListener("keydown", onKey);
				};
			}, [open]);
			/** Bind the whole selection host-side (first tab is the tool default). */
			const syncHost = (next) => {
				if (next.length === 0) return;
				fetch("/chrome-browser/select", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						sessionId: props.sessionId,
						tabIds: next.map((tab) => tab.id)
					})
				}).catch(() => {});
			};
			const applySelection = (next) => {
				setSelectedIds(next.map((tab) => tab.id));
				syncHost(next);
			};
			const toggle = (id) => {
				const current = (tabs ?? []).filter((tab) => selectedIds.includes(tab.id));
				const target = (tabs ?? []).find((tab) => tab.id === id);
				if (target === void 0) return;
				const next = current.some((tab) => tab.id === id) ? current.filter((tab) => tab.id !== id) : [...current, target];
				applySelection(next);
			};
			const remove = (id) => {
				applySelection((tabs ?? []).filter((tab) => selectedIds.includes(tab.id)).filter((tab) => tab.id !== id));
			};
			const summary = selectedIds.length === 0 ? "选择浏览器标签页" : `${selectedIds.length} 个标签页`;
			const rows = error !== void 0 ? [{
				id: "__error",
				label: error,
				disabled: true
			}] : tabs === null ? [{
				id: "__loading",
				label: "正在列出你的 Chrome 标签页…",
				disabled: true
			}] : tabs.length === 0 ? [{
				id: "__empty",
				label: "没有可用标签页",
				disabled: true
			}] : tabs.map((tab) => ({
				id: tab.id,
				label: tab.title === "" ? tab.url : tab.title,
				icon: tab.favicon,
				disabled: false
			}));
			return react.default.createElement("div", {
				ref: cardRef,
				style: {
					boxSizing: "border-box",
					flex: "none",
					overflow: "hidden",
					margin: "0 auto",
					width: "calc(100% - var(--dsh-composer-side-clearance) * 2 - var(--dsh-composer-dock-inset) * 4)",
					maxWidth: "calc(var(--dsh-composer-card-max-width) - var(--dsh-composer-dock-inset) * 4)",
					border: "1px solid var(--dsw-alias-border-l1)",
					borderRadius: 12,
					background: "var(--dsw-specific-tip)",
					display: "flex",
					alignItems: "center",
					gap: 8,
					flexWrap: "wrap",
					minWidth: 0,
					fontSize: 12,
					padding: "6px 12px",
					cursor: "pointer"
				},
				onClick: () => {
					setOpen(!open);
					if (!open) refresh();
				},
				title: "选择浏览器标签页(发送给 AI)"
			}, react.default.createElement(ChromeIcon, { size: 16 }), selectedTabs.map((tab) => react.default.createElement("span", {
				key: tab.id,
				onClick: (event) => event.stopPropagation(),
				style: {
					display: "inline-flex",
					alignItems: "center",
					gap: 5,
					border: "1px solid #8884",
					borderRadius: 999,
					padding: "2px 6px",
					maxWidth: 260,
					overflow: "hidden",
					whiteSpace: "nowrap"
				}
			}, react.default.createElement(Favicon, {
				url: tab.favicon,
				fallback: fallbackGlyph(tab)
			}), react.default.createElement("span", { style: {
				overflow: "hidden",
				textOverflow: "ellipsis",
				whiteSpace: "nowrap"
			} }, tab.title === "" ? tab.url : tab.title), react.default.createElement("button", {
				type: "button",
				style: {
					border: "none",
					background: "none",
					cursor: "pointer",
					padding: 0,
					fontSize: 11,
					opacity: .7
				},
				title: "移除",
				onClick: (event) => {
					event.stopPropagation();
					remove(tab.id);
				}
			}, "×"))), react.default.createElement("span", { style: {
				display: "inline-flex",
				alignItems: "center",
				gap: 4,
				padding: 0,
				marginLeft: "auto",
				fontSize: 12,
				color: "inherit",
				userSelect: "none"
			} }, summary, react.default.createElement(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { size: 14 })), open && position !== null ? react.default.createElement("div", {
				ref: listRef,
				className: "cb-tab-list",
				role: "menu",
				style: {
					position: "fixed",
					left: position.left,
					top: position.top,
					width: position.width,
					height: LIST_HEIGHT,
					zIndex: 1100
				}
			}, rows.map((row) => react.default.createElement("button", {
				key: row.id,
				type: "button",
				role: "menuitem",
				className: `cb-row${selectedIds.includes(row.id) ? " cb-selected" : ""}${row.disabled === true ? " cb-disabled" : ""}`,
				disabled: row.disabled,
				onMouseDown: (event) => event.preventDefault(),
				onClick: (event) => {
					event.stopPropagation();
					if (!row.disabled && !row.id.startsWith("__")) toggle(row.id);
				}
			}, react.default.createElement(Favicon, {
				url: row.icon,
				fallback: "🌐"
			}), react.default.createElement("span", { className: "cb-title" }, row.label), selectedIds.includes(row.id) ? react.default.createElement("span", { className: "cb-check" }, react.default.createElement(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutline16, { size: 16 })) : null))) : null);
		}
		//#endregion
		//#region lib/client/index.js
		/**
		* chrome-browser plugin, browser half: registers the composer dock entry (a
		* full-width row above the input card) holding the tab selector. The
		* selector lists the user's real Chrome tabs, supports multi-select, and
		* keeps the whole selection host-side per session (reported to the model
		* through chrome_tabs' `session` field) — it never touches the input box or
		* any message content.
		* @module @liuyera/dsh-chrome-browser/client
		*/
		/** Required services for the slot contributions. */
		const inject = ["slots"];
		/**
		* Client plugin body: register the composer dock tab selector.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.slots.inject("conversation.input.dock", () => ctx.slots.register({
				name: "conversation.input.dock",
				id: "chrome-browser-tab-select",
				order: 5
			}, TabPicker));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map