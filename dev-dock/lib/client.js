window.__ModuleLoader__.load({
	id: "@liyuera/dsh-dev-dock",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_runtime_client = require("@deepseek-ai/dsh-client-runtime/client");
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		//#region lib/types/client/data.js
		/**
		* devDock browser data layer v2: mirrors the plugin's settings namespace
		* through settingsScope and exposes the desktop-action bridge. The bridge is
		* a same-origin POST to the plugin's host route (`/dev-dock/action`) because
		* static client bundles have no package-private RPC channel (host.call is a
		* dynamic-plugin builtin); the web server route is registered by the host
		* half and runs deterministic desktop actions.
		* @module @liyuera/dsh-dev-dock/client/data
		*/
		/** Canonical editor names across platforms (union for stable UI display). */
		const EDITOR_NAMES = [
			"WebStorm",
			"VS Code",
			"IntelliJ IDEA",
			"Cursor",
			"Sublime Text",
			"HBuilderX"
		];
		/**
		* Create the devDock data layer for one client plugin fiber.
		* @param ctx - client root context (needs settingsScope).
		* @returns the settings mirror and the action facade.
		*/
		function createDevDockData(ctx) {
			const scope = ctx.settingsScope.bind({
				namespace: "dev-dock",
				decode: decodeSettings
			});
			const store = (0, _deepseek_ai_dsh_client_runtime_client.createSnapshotStore)({
				ready: false,
				settings: void 0
			});
			const reflect = () => {
				const snapshot = scope.getSnapshot();
				store.set({
					ready: snapshot.status === "ready",
					settings: snapshot.value
				});
			};
			reflect();
			const unsubscribe = scope.subscribe(reflect);
			ctx.effect(() => unsubscribe, "dev-dock: settings mirror");
			const write = async (field, value) => {
				await scope.set(field, value);
			};
			return {
				store,
				actions: {
					async setWorkspacePref(workspaceId, editor) {
						const current = store.getSnapshot().settings;
						if (current === void 0) return;
						const rest = current.workspacePrefs.filter((p) => p.workspaceId !== workspaceId);
						await write("workspacePrefs", editor === "" ? rest : [...rest, {
							workspaceId,
							editor
						}]);
					},
					async setEditorManualPath(name, manualPath) {
						const current = store.getSnapshot().settings;
						if (current === void 0) return;
						await write("editors", current.editors.find((e) => e.name === name) === void 0 ? [...current.editors, {
							name,
							manualPath
						}] : current.editors.map((e) => e.name === name ? {
							...e,
							manualPath
						} : e));
					},
					async setTerminalApp(app) {
						await write("terminalApp", app);
					},
					async setStartWork(workspaceIds) {
						await write("startWork", workspaceIds);
					},
					listEditors: () => rpcAction("list-editors"),
					openIde: (workspaceId) => rpcAction("open-ide", { workspaceId }),
					openTerminal: (workspaceId) => rpcAction("open-terminal", { workspaceId }),
					start: (workspaceId) => rpcAction("start", { workspaceId }),
					startWork: (workspaceIds) => rpcAction("start-work", { workspaceIds })
				}
			};
		}
		/** Decode the wire section into the settings document (lenient cast). */
		function decodeSettings(section) {
			if (section === null || typeof section !== "object") return void 0;
			const doc = section;
			if (!Array.isArray(doc.workspacePrefs) || !Array.isArray(doc.editors) || !Array.isArray(doc.startWork)) return;
			return {
				workspacePrefs: doc.workspacePrefs,
				editors: doc.editors,
				terminalApp: doc.terminalApp === "iterm" ? "iterm" : "default",
				startWork: doc.startWork
			};
		}
		/**
		* POST one action to the plugin's host route.
		* @param action - action name.
		* @param extra - additional JSON fields.
		* @returns the host answer, or a fetch-failure answer when the wire failed.
		*/
		async function rpcAction(action, extra = {}) {
			try {
				return await (await fetch("/dev-dock/action", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						action,
						...extra
					})
				})).json();
			} catch (error) {
				return {
					ok: false,
					error: `devDock action route unreachable: ${error instanceof Error ? error.message : String(error)}`
				};
			}
		}
		//#endregion
		//#region lib/types/client/stores.js
		/**
		* devDock panel viewing store: the start-work dialog open state. Shared by
		* the sidebar footer button and entry row so the dialog opens from either
		* and survives entry/overlay remounts.
		* @module @liyuera/dsh-dev-dock/client/stores
		*/
		/**
		* Create the devDock viewing store.
		* @returns the store handle (spec + type + identity + factory in one).
		*/
		function createDevDockStore() {
			return (0, _deepseek_ai_dsh_client_runtime_client.defineStore)({
				init: () => ({ open: false }),
				actions: { setOpen: (draft, open) => {
					draft.open = open;
				} }
			});
		}
		//#endregion
		//#region lib/types/client/icons.js
		/** Terminal glyph: `>_` command prompt. */
		const TERMINAL_STROKE = {
			stroke: "currentColor",
			strokeWidth: 1.4,
			strokeLinecap: "round",
			strokeLinejoin: "round"
		};
		/**
		* IDE glyph: `</>` code brackets.
		* @param props - icon size and optional class.
		* @returns the 16px editor svg.
		*/
		function DevIdeIcon({ size = 16, className }) {
			return (0, react_jsx_runtime.jsxs)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 16 16",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.4",
				strokeLinecap: "round",
				strokeLinejoin: "round",
				className,
				xmlns: "http://www.w3.org/2000/svg",
				children: [
					(0, react_jsx_runtime.jsx)("path", { d: "M5.0 4.8 2.6 8 5.0 11.2" }),
					(0, react_jsx_runtime.jsx)("path", { d: "M11.0 4.8 13.4 8 11.0 11.2" }),
					(0, react_jsx_runtime.jsx)("path", { d: "M8.7 4.6 7.3 11.4" })
				]
			});
		}
		/**
		* Terminal glyph: `>_` prompt.
		* @param props - icon size and optional class.
		* @returns the 16px terminal svg.
		*/
		function DevTerminalIcon({ size = 16, className }) {
			return (0, react_jsx_runtime.jsxs)("svg", {
				...TERMINAL_STROKE,
				width: size,
				height: size,
				viewBox: "0 0 16 16",
				fill: "none",
				className,
				xmlns: "http://www.w3.org/2000/svg",
				children: [(0, react_jsx_runtime.jsx)("path", { d: "M4.4 4.8 7.6 8 4.4 11.2" }), (0, react_jsx_runtime.jsx)("path", { d: "M8.6 11.2H11.8" })]
			});
		}
		/**
		* App-icon-style terminal fallback: a dark rounded square with a light `>_`
		* prompt, used where the real app icon is unavailable (Assets.car-only
		* bundles, other platforms).
		* @param props - icon size and optional class.
		* @returns the 16px filled terminal svg.
		*/
		function DevTerminalAppIcon({ size = 16, className }) {
			return (0, react_jsx_runtime.jsxs)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 16 16",
				fill: "none",
				className,
				xmlns: "http://www.w3.org/2000/svg",
				children: [
					(0, react_jsx_runtime.jsx)("rect", {
						x: "1.6",
						y: "1.6",
						width: "12.8",
						height: "12.8",
						rx: "3.4",
						fill: "#23272E"
					}),
					(0, react_jsx_runtime.jsx)("path", {
						d: "M4.7 5.2 7.4 8 4.7 10.8",
						stroke: "#E8EAED",
						strokeWidth: "1.4",
						strokeLinecap: "round",
						strokeLinejoin: "round"
					}),
					(0, react_jsx_runtime.jsx)("path", {
						d: "M8.1 10.9H11.5",
						stroke: "#E8EAED",
						strokeWidth: "1.4",
						strokeLinecap: "round"
					})
				]
			});
		}
		/**
		* App-icon-style editor fallback: a blue rounded square with a white `</>`
		* mark, used where the real app icon is unavailable.
		* @param props - icon size and optional class.
		* @returns the 16px filled editor svg.
		*/
		function DevIdeAppIcon({ size = 16, className }) {
			return (0, react_jsx_runtime.jsxs)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 16 16",
				fill: "none",
				className,
				xmlns: "http://www.w3.org/2000/svg",
				children: [
					(0, react_jsx_runtime.jsx)("rect", {
						x: "1.6",
						y: "1.6",
						width: "12.8",
						height: "12.8",
						rx: "3.4",
						fill: "#3D8BFF"
					}),
					(0, react_jsx_runtime.jsx)("path", {
						d: "M5.6 5.4 3.3 8 5.6 10.6",
						stroke: "#FFFFFF",
						strokeWidth: "1.4",
						strokeLinecap: "round",
						strokeLinejoin: "round"
					}),
					(0, react_jsx_runtime.jsx)("path", {
						d: "M10.4 5.4 12.7 8 10.4 10.6",
						stroke: "#FFFFFF",
						strokeWidth: "1.4",
						strokeLinecap: "round",
						strokeLinejoin: "round"
					}),
					(0, react_jsx_runtime.jsx)("path", {
						d: "M9.1 5.1 7.5 10.9",
						stroke: "#FFFFFF",
						strokeWidth: "1.4",
						strokeLinecap: "round"
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-css:/Users/liyu/Documents/www/DeepSeek/deepseek-harness/deekseek-harness-plugin/dev-dock/src/client/StartTile.module.css.mjs
		const css$4 = ".QwuPeq_tile{border-radius:4px;width:16px;height:16px;display:block;position:relative;overflow:hidden}.QwuPeq_halfTerminal{clip-path:polygon(0 0,100% 0,0 100%);justify-content:flex-start;align-items:flex-start;display:flex;position:absolute;inset:0}.QwuPeq_halfIde{clip-path:polygon(100% 0,100% 100%,0 100%);justify-content:flex-end;align-items:flex-end;display:flex;position:absolute;inset:0}.QwuPeq_img{object-fit:cover;width:100%;height:100%;display:block}.QwuPeq_tile:after{content:\"\";pointer-events:none;background:linear-gradient(to bottom right, transparent 40%, color-mix(in srgb, var(--dsw-alias-bg-layer-1) 55%, transparent) 50%, transparent 60%);position:absolute;inset:0}";
		const tagId$4 = "@liyuera/dsh-dev-dock/StartTile.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$4) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@liyuera/dsh-dev-dock";
			tag.dataset.pluginCss = tagId$4;
			tag.textContent = css$4;
			document.head.appendChild(tag);
		}
		var StartTile_module_css_default = {
			"halfIde": "QwuPeq_halfIde",
			"halfTerminal": "QwuPeq_halfTerminal",
			"img": "QwuPeq_img",
			"tile": "QwuPeq_tile"
		};
		//#endregion
		//#region lib/types/client/StartTile.js
		/**
		* Start-work tile: a 16px rounded square split from top-right to
		* bottom-left — the terminal icon in the upper-left half, the editor icon in
		* the lower-right half, no border or padding, with a soft diagonal seam
		* blending the two halves. Used by the session-header start button and the
		* sidebar start-work button, with app icons when resolvable and
		* app-icon-style fallbacks otherwise.
		* @module @liyuera/dsh-dev-dock/client/StartTile
		*/
		/**
		* Render the combined start-work tile.
		* @param props - optional app-icon URLs per half and the tile edge.
		* @returns the split tile.
		*/
		function StartTile({ ideSrc, termSrc, size = 16 }) {
			const [failed, setFailed] = (0, react.useState)({
				ide: false,
				term: false
			});
			(0, react.useEffect)(() => {
				setFailed({
					ide: false,
					term: false
				});
			}, [ideSrc, termSrc]);
			return (0, react_jsx_runtime.jsxs)("span", {
				className: StartTile_module_css_default.tile,
				style: {
					width: size,
					height: size
				},
				"aria-hidden": "true",
				children: [(0, react_jsx_runtime.jsx)("span", {
					className: StartTile_module_css_default.halfTerminal,
					children: failed.term || termSrc === void 0 ? (0, react_jsx_runtime.jsx)(DevTerminalAppIcon, {
						size,
						className: StartTile_module_css_default.img
					}) : (0, react_jsx_runtime.jsx)("img", {
						className: StartTile_module_css_default.img,
						src: termSrc,
						alt: "",
						onError: () => {
							setFailed((current) => ({
								...current,
								term: true
							}));
						}
					})
				}), (0, react_jsx_runtime.jsx)("span", {
					className: StartTile_module_css_default.halfIde,
					children: failed.ide || ideSrc === void 0 ? (0, react_jsx_runtime.jsx)(DevIdeAppIcon, {
						size,
						className: StartTile_module_css_default.img
					}) : (0, react_jsx_runtime.jsx)("img", {
						className: StartTile_module_css_default.img,
						src: ideSrc,
						alt: "",
						onError: () => {
							setFailed((current) => ({
								...current,
								ide: true
							}));
						}
					})
				})]
			});
		}
		//#endregion
		//#region \0dsh-css:/Users/liyu/Documents/www/DeepSeek/deepseek-harness/deekseek-harness-plugin/dev-dock/src/client/StartWorkButton.module.css.mjs
		const css$3 = ".g9vv4q_row{box-sizing:border-box;width:calc(100% + 4px);height:42px;color:var(--dsw-alias-label-primary);cursor:pointer;text-align:left;transition:background var(--ds-transition-duration-fast) var(--ds-ease-in-out);background:0 0;border:none;border-radius:12px;align-items:center;gap:8px;margin:4px -2px;padding:0 10px 0 8px;display:flex;overflow:hidden}.g9vv4q_row:hover{background:var(--dsw-alias-interactive-bg-hover)}.g9vv4q_row:active{background:var(--dsw-alias-interactive-bg-active)}.g9vv4q_label{white-space:nowrap;font-size:14px;line-height:22px;overflow:hidden}.g9vv4q_railButton{width:36px;height:36px;color:var(--dsw-alias-label-secondary);cursor:pointer;transition:background var(--ds-transition-duration-fast) var(--ds-ease-in-out);background:0 0;border:none;border-radius:50%;justify-content:center;align-items:center;margin:8px 0 10px;padding:0;display:flex}.g9vv4q_railButton:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}";
		const tagId$3 = "@liyuera/dsh-dev-dock/StartWorkButton.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$3) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@liyuera/dsh-dev-dock";
			tag.dataset.pluginCss = tagId$3;
			tag.textContent = css$3;
			document.head.appendChild(tag);
		}
		var StartWorkButton_module_css_default = {
			"label": "g9vv4q_label",
			"railButton": "g9vv4q_railButton",
			"row": "g9vv4q_row"
		};
		//#endregion
		//#region lib/types/client/StartWorkButton.js
		/**
		* The sidebar footer start-work button.
		* @param props - footer owner state, view store, settings mirror, translator.
		* @returns the button row.
		*/
		function StartWorkButton({ wide, useWorkspaces, useDevDockData, actions, t }) {
			const label = t("start.button");
			const settings = useDevDockData((data) => data.settings);
			const firstWorkspaceId = useWorkspaces((state) => state.items[0]?.workspaceId);
			const editorPref = settings?.workspacePrefs.find((p) => p.workspaceId === firstWorkspaceId)?.editor ?? "";
			const ideSrc = firstWorkspaceId === void 0 ? void 0 : `/dev-dock/workspace-editor-icon?workspaceId=${encodeURIComponent(firstWorkspaceId)}&v=${encodeURIComponent(editorPref)}`;
			const termSrc = `/dev-dock/terminal-icon?app=${encodeURIComponent(settings?.terminalApp ?? "default")}`;
			if (!wide) return (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: StartWorkButton_module_css_default.railButton,
				title: label,
				"aria-label": label,
				onClick: () => {
					actions.setOpen(true);
				},
				children: (0, react_jsx_runtime.jsx)(StartTile, {
					ideSrc,
					termSrc,
					size: 18
				})
			});
			return (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				className: StartWorkButton_module_css_default.row,
				title: label,
				onClick: () => {
					actions.setOpen(true);
				},
				children: [(0, react_jsx_runtime.jsx)(StartTile, {
					ideSrc,
					termSrc
				}), (0, react_jsx_runtime.jsx)("span", {
					className: StartWorkButton_module_css_default.label,
					children: label
				})]
			});
		}
		//#endregion
		//#region \0dsh-css:/Users/liyu/Documents/www/DeepSeek/deepseek-harness/deekseek-harness-plugin/dev-dock/src/client/StartWork.module.css.mjs
		const css$2 = ".owaCVq_dialog{width:min(570px,100%)}.owaCVq_actionBtn{min-width:96px;padding:0 20px}.owaCVq_list{flex-direction:column;gap:4px;max-height:426px;margin:0;padding:0;list-style:none;display:flex;overflow-y:auto}.owaCVq_row{cursor:pointer;border-radius:8px;align-items:center;gap:8px;padding:8px 10px;display:flex}.owaCVq_row:hover{background:var(--dsw-alias-interactive-bg-hover)}.owaCVq_row input{flex:none}.owaCVq_rowIcon{flex:none;display:block}.owaCVq_name{min-width:0;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;flex:auto;font-size:13px;font-weight:600}.owaCVq_empty{color:var(--dsw-alias-label-secondary);margin:0;font-size:13px}.owaCVq_error{color:var(--dsw-alias-state-error,var(--dsw-alias-label-error));margin:10px 0 0;font-size:12.5px}";
		const tagId$2 = "@liyuera/dsh-dev-dock/StartWork.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$2) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@liyuera/dsh-dev-dock";
			tag.dataset.pluginCss = tagId$2;
			tag.textContent = css$2;
			document.head.appendChild(tag);
		}
		var StartWork_module_css_default = {
			"actionBtn": "owaCVq_actionBtn",
			"dialog": "owaCVq_dialog",
			"empty": "owaCVq_empty",
			"error": "owaCVq_error",
			"list": "owaCVq_list",
			"name": "owaCVq_name",
			"row": "owaCVq_row",
			"rowIcon": "owaCVq_rowIcon"
		};
		//#endregion
		//#region lib/types/client/StartWorkModal.js
		/**
		* Start-work dialog: check the workspace projects to launch, confirming
		* starts each selected project's editor + system terminal. The selection is
		* remembered in settings and prefilled next time.
		*/
		/**
		* The start-work dialog.
		* @param props - overlay runtime, view store, data hook, actions, translator.
		* @returns the modal, or null when closed.
		*/
		function StartWorkModal({ useStore, actions, useWorkspaces, useDevDockData, dataActions, t }) {
			const { open } = useStore((state) => state);
			const workspaces = useWorkspaces((state) => state.items);
			const settings = useDevDockData((data) => data.settings);
			const [selection, setSelection] = (0, react.useState)(/* @__PURE__ */ new Set());
			const [phase, setPhase] = (0, react.useState)("idle");
			const [error, setError] = (0, react.useState)("");
			(0, react.useEffect)(() => {
				if (!open) return;
				const remembered = settings?.startWork ?? [];
				const available = new Set(workspaces.map((w) => w.workspaceId));
				setSelection(new Set(remembered.filter((id) => available.has(id))));
				setPhase("idle");
				setError("");
			}, [
				open,
				settings,
				workspaces
			]);
			if (!open) return null;
			const toggle = (workspaceId) => {
				setSelection((current) => {
					const next = new Set(current);
					if (next.has(workspaceId)) next.delete(workspaceId);
					else next.add(workspaceId);
					return next;
				});
			};
			const confirm = async () => {
				const ids = workspaces.map((w) => w.workspaceId).filter((id) => selection.has(id));
				if (ids.length === 0) return;
				setPhase("running");
				const answer = await dataActions.startWork(ids);
				await dataActions.setStartWork(ids);
				if (answer.ok) {
					actions.setOpen(false);
					return;
				}
				setError("fetchError" in answer ? answer.error ?? String(answer.fetchError) : answer.error ?? "start failed");
				setPhase("error");
			};
			const close = () => {
				actions.setOpen(false);
			};
			return (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: true,
				onClose: close,
				title: t("start.button"),
				closeLabel: t("start.cancel"),
				description: t("start.notice"),
				className: StartWork_module_css_default.dialog,
				footer: (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					size: "md",
					variant: "outline",
					className: StartWork_module_css_default.actionBtn,
					onClick: close,
					disabled: phase === "running",
					children: t("start.cancel")
				}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					size: "md",
					variant: "primary",
					className: StartWork_module_css_default.actionBtn,
					onClick: () => {
						confirm();
					},
					disabled: selection.size === 0 || phase === "running",
					children: phase === "running" ? t("start.running") : t("start.confirm")
				})] }),
				children: [workspaces.length === 0 ? (0, react_jsx_runtime.jsx)("p", {
					className: StartWork_module_css_default.empty,
					children: t("start.empty")
				}) : (0, react_jsx_runtime.jsx)("ul", {
					className: StartWork_module_css_default.list,
					"aria-label": t("start.button"),
					children: workspaces.map((workspace) => {
						const pref = settings?.workspacePrefs.find((p) => p.workspaceId === workspace.workspaceId)?.editor ?? "";
						const ideSrc = `/dev-dock/workspace-editor-icon?workspaceId=${encodeURIComponent(workspace.workspaceId)}&v=${encodeURIComponent(pref)}`;
						const termSrc = `/dev-dock/terminal-icon?app=${encodeURIComponent(settings?.terminalApp ?? "default")}`;
						return (0, react_jsx_runtime.jsx)("li", { children: (0, react_jsx_runtime.jsxs)("label", {
							className: StartWork_module_css_default.row,
							children: [
								(0, react_jsx_runtime.jsx)("input", {
									type: "checkbox",
									checked: selection.has(workspace.workspaceId),
									onChange: () => {
										toggle(workspace.workspaceId);
									},
									disabled: phase === "running"
								}),
								(0, react_jsx_runtime.jsx)("span", {
									className: StartWork_module_css_default.rowIcon,
									children: (0, react_jsx_runtime.jsx)(StartTile, {
										ideSrc,
										termSrc
									})
								}),
								(0, react_jsx_runtime.jsx)("span", {
									className: StartWork_module_css_default.name,
									children: workspace.title || workspace.path
								})
							]
						}) }, workspace.workspaceId);
					})
				}), phase === "error" && (0, react_jsx_runtime.jsx)("p", {
					className: StartWork_module_css_default.error,
					role: "alert",
					children: error
				})]
			});
		}
		//#endregion
		//#region \0dsh-css:/Users/liyu/Documents/www/DeepSeek/deepseek-harness/deekseek-harness-plugin/dev-dock/src/client/SessionActions.module.css.mjs
		const css$1 = "._R6sKG_button{min-width:28px;min-height:28px;color:var(--dsw-alias-label-secondary);cursor:pointer;transition:background var(--ds-transition-duration-fast) var(--ds-ease-in-out);background:0 0;border:0;border-radius:6px;justify-content:center;align-items:center;padding:4px;display:inline-flex}._R6sKG_appIcon{border-radius:4px;width:16px;height:16px}._R6sKG_group{align-items:center;gap:2px;display:inline-flex}._R6sKG_group ._R6sKG_button{min-width:24px;min-height:24px;padding:3px}._R6sKG_button:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}._R6sKG_button:disabled,._R6sKG_button[aria-disabled=true]{opacity:.5;cursor:default}._R6sKG_error{color:var(--dsw-alias-state-error,var(--dsw-alias-label-error))}";
		const tagId$1 = "@liyuera/dsh-dev-dock/SessionActions.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@liyuera/dsh-dev-dock";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var SessionActions_module_css_default = {
			"appIcon": "_R6sKG_appIcon",
			"button": "_R6sKG_button",
			"error": "_R6sKG_error",
			"group": "_R6sKG_group"
		};
		//#endregion
		//#region lib/types/client/ComposerActions.js
		/**
		* Composer actions: the three devDock buttons (IDE / terminal / start) in
		* the input tool row's left seat, bound to the current session's workspace.
		* Same resolution and feedback as the session-header actions, in a compact
		* group beside the resident chrome.
		*/
		/** Locale key per action kind. */
		const KIND_KEY = {
			ide: "header.ide",
			terminal: "header.terminal",
			start: "header.start"
		};
		/**
		* The composer tool-row action group.
		* @param props - input-zone runtime, settings mirror, actions, translator.
		* @returns the three buttons, or null when the session has no workspace.
		*/
		function ComposerActions({ sessionId, useWorkspaces, useDevDockData, dataActions, t }) {
			const workspace = useWorkspaces((state) => state.items.find((w) => w.sessionIds.includes(sessionId)));
			const settings = useDevDockData((data) => data.settings);
			const [states, setStates] = (0, react.useState)({
				ide: "idle",
				terminal: "idle",
				start: "idle"
			});
			const [errors, setErrors] = (0, react.useState)({});
			const [iconFailed, setIconFailed] = (0, react.useState)({});
			const timer = (0, react.useRef)(null);
			(0, react.useEffect)(() => () => {
				if (timer.current !== null) clearTimeout(timer.current);
			}, []);
			const editorPref = settings?.workspacePrefs.find((p) => p.workspaceId === workspace?.workspaceId)?.editor ?? "";
			const terminalApp = settings?.terminalApp ?? "default";
			const editorIconUrl = workspace === void 0 ? "" : `/dev-dock/workspace-editor-icon?workspaceId=${encodeURIComponent(workspace.workspaceId)}&v=${encodeURIComponent(editorPref)}`;
			const terminalIconUrl = `/dev-dock/terminal-icon?app=${encodeURIComponent(terminalApp)}`;
			(0, react.useEffect)(() => {
				setIconFailed({});
			}, [editorIconUrl, terminalIconUrl]);
			if (workspace === void 0) return null;
			const run = async (kind) => {
				if (states[kind] === "busy") return;
				setStates((current) => ({
					...current,
					[kind]: "busy"
				}));
				const answer = kind === "ide" ? await dataActions.openIde(workspace.workspaceId) : kind === "terminal" ? await dataActions.openTerminal(workspace.workspaceId) : await dataActions.start(workspace.workspaceId);
				setStates((current) => ({
					...current,
					[kind]: answer.ok ? "ok" : "error"
				}));
				if (!answer.ok) setErrors((current) => ({
					...current,
					[kind]: answer.error ?? "unknown error"
				}));
				if (timer.current !== null) clearTimeout(timer.current);
				timer.current = setTimeout(() => {
					setStates({
						ide: "idle",
						terminal: "idle",
						start: "idle"
					});
				}, answer.ok ? 1500 : 4e3);
			};
			const kindIcon = (kind) => {
				if (kind === "ide") return iconFailed.ide === true ? (0, react_jsx_runtime.jsx)(DevIdeAppIcon, { size: 16 }) : (0, react_jsx_runtime.jsx)("img", {
					className: SessionActions_module_css_default.appIcon,
					src: editorIconUrl,
					alt: "",
					onError: () => {
						setIconFailed((c) => ({
							...c,
							ide: true
						}));
					}
				});
				if (kind === "terminal") return iconFailed.terminal === true ? (0, react_jsx_runtime.jsx)(DevTerminalAppIcon, { size: 16 }) : (0, react_jsx_runtime.jsx)("img", {
					className: SessionActions_module_css_default.appIcon,
					src: terminalIconUrl,
					alt: "",
					onError: () => {
						setIconFailed((c) => ({
							...c,
							terminal: true
						}));
					}
				});
				return (0, react_jsx_runtime.jsx)(StartTile, {
					ideSrc: editorIconUrl,
					termSrc: terminalIconUrl
				});
			};
			return (0, react_jsx_runtime.jsx)("span", {
				className: SessionActions_module_css_default.group,
				children: [
					"ide",
					"terminal",
					"start"
				].map((kind) => {
					const state = states[kind];
					const title = state === "error" ? t("header.error", { error: errors[kind] ?? "" }) : t(KIND_KEY[kind]);
					return (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: `${SessionActions_module_css_default.button} ${state === "error" ? SessionActions_module_css_default.error : ""}`,
						title,
						"aria-label": title,
						"aria-disabled": state === "busy",
						onClick: () => {
							run(kind);
						},
						children: state === "ok" ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutline16, { size: 16 }) : kindIcon(kind)
					}, kind);
				})
			});
		}
		//#endregion
		//#region \0dsh-css:/Users/liyu/Documents/www/DeepSeek/deepseek-harness/deekseek-harness-plugin/dev-dock/src/client/DevDockSettingsPage.module.css.mjs
		const css = ".jdoFgq_page{flex-direction:column;gap:8px;display:flex}.jdoFgq_heading{color:var(--dsw-alias-label-primary);margin:12px 0 0;font-size:14px;font-weight:600}.jdoFgq_hint{color:var(--dsw-alias-label-secondary);margin:0 0 8px;font-size:12px;line-height:18px}.jdoFgq_rows{flex-direction:column;gap:6px;margin:0 0 8px;padding:0;list-style:none;display:flex}.jdoFgq_row{justify-content:space-between;align-items:center;gap:12px;display:flex}.jdoFgq_name{color:var(--dsw-alias-label-primary);text-overflow:ellipsis;white-space:nowrap;min-width:0;font-size:12.5px;font-weight:600;overflow:hidden}.jdoFgq_selector{background:var(--dsw-alias-bg-module-platform);height:36px;font:inherit;color:var(--dsw-alias-label-primary);cursor:pointer;border:none;border-radius:18px;align-items:center;gap:4px;padding:0 14px;font-size:14px;line-height:22px;display:inline-flex}.jdoFgq_selector:hover{background:var(--dsw-alias-interactive-bg-hover)}.jdoFgq_chevron{color:var(--dsw-alias-label-secondary);transition:transform var(--ds-transition-duration-fast) var(--ds-ease-in-out);flex:none;display:inline-flex}.jdoFgq_chevronOpen{transform:rotate(180deg)}.jdoFgq_editorRow{align-items:center;gap:10px;margin:0 0 8px;display:flex}.jdoFgq_editorName{flex:none;align-items:center;gap:8px;width:150px;display:flex}.jdoFgq_editorIcon{border-radius:5px;flex:none;width:20px;height:20px}.jdoFgq_editorLabel{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.jdoFgq_editorInput{flex:auto;min-width:0}.jdoFgq_editorSave{flex:none}.jdoFgq_refreshRow{align-items:center;gap:10px;margin-bottom:8px;display:flex}.jdoFgq_radioRow{color:var(--dsw-alias-label-primary);cursor:pointer;align-items:center;gap:8px;margin-bottom:6px;font-size:12.5px;display:flex}.jdoFgq_error{color:var(--dsw-alias-state-error,var(--dsw-alias-label-error));font-size:12px}";
		const tagId = "@liyuera/dsh-dev-dock/DevDockSettingsPage.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@liyuera/dsh-dev-dock";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var DevDockSettingsPage_module_css_default = {
			"chevron": "jdoFgq_chevron",
			"chevronOpen": "jdoFgq_chevronOpen",
			"editorIcon": "jdoFgq_editorIcon",
			"editorInput": "jdoFgq_editorInput",
			"editorLabel": "jdoFgq_editorLabel",
			"editorName": "jdoFgq_editorName",
			"editorRow": "jdoFgq_editorRow",
			"editorSave": "jdoFgq_editorSave",
			"error": "jdoFgq_error",
			"heading": "jdoFgq_heading",
			"hint": "jdoFgq_hint",
			"name": "jdoFgq_name",
			"page": "jdoFgq_page",
			"radioRow": "jdoFgq_radioRow",
			"refreshRow": "jdoFgq_refreshRow",
			"row": "jdoFgq_row",
			"rows": "jdoFgq_rows",
			"selector": "jdoFgq_selector"
		};
		//#endregion
		//#region lib/types/client/DevDockSettingsPage.js
		/**
		* devDock settings page (`settings.section`): per-workspace editor
		* preference, editor manual paths + detection refresh, and the terminal
		* preference. Data rides the settings namespace mirror; desktop detection
		* goes through the host route.
		*/
		/** Stable union of editor names for the preference selects. */
		const EDITOR_OPTIONS = EDITOR_NAMES;
		/**
		* dsh-style editor pill: rounded-chrome trigger plus the primitives Menu
		* trailing-check popup (same pattern as the permission preset selector).
		* @param props - current editor, available options, change callback.
		* @returns the pill and its menu.
		*/
		function WorkspaceEditorSelect({ value, options, onChange }) {
			const [open, setOpen] = (0, react.useState)(false);
			const items = [{
				id: "",
				label: "自动"
			}, ...options.map((name) => ({
				id: name,
				label: name
			}))];
			const display = value === "" ? "自动" : value;
			return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
				open,
				items,
				selectedId: value === "" ? "" : value,
				onSelect: (id) => {
					setOpen(false);
					onChange(id);
				},
				onClose: () => {
					setOpen(false);
				},
				align: "end",
				side: "bottom",
				anchor: (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: DevDockSettingsPage_module_css_default.selector,
					onClick: () => {
						setOpen(!open);
					},
					children: [(0, react_jsx_runtime.jsx)("span", { children: display }), (0, react_jsx_runtime.jsx)("span", {
						className: `${DevDockSettingsPage_module_css_default.chevron} ${open ? DevDockSettingsPage_module_css_default.chevronOpen : ""}`,
						"aria-hidden": true,
						children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, {})
					})]
				})
			});
		}
		/**
		* Render the devDock settings page.
		* @param props - settings runtime, data hook, actions, translator.
		* @returns the settings sections.
		*/
		function DevDockSettingsPage({ useWorkspaces, useDevDockData, dataActions, t }) {
			const workspaces = useWorkspaces((state) => state.items);
			const settings = useDevDockData((data) => data.settings);
			const [drafts, setDrafts] = (0, react.useState)({});
			const [detecting, setDetecting] = (0, react.useState)(false);
			const [detectError, setDetectError] = (0, react.useState)("");
			const [iconFailed, setIconFailed] = (0, react.useState)({});
			const prefs = settings?.workspacePrefs ?? [];
			const editors = settings?.editors ?? [];
			const editorNames = [...new Set([...EDITOR_OPTIONS, ...editors.map((e) => e.name)])];
			const prefOf = (workspaceId) => prefs.find((p) => p.workspaceId === workspaceId)?.editor ?? "";
			const setPref = async (workspaceId, editor) => {
				await dataActions.setWorkspacePref(workspaceId, editor);
			};
			const saveManual = async (name, value) => {
				await dataActions.setEditorManualPath(name, value);
			};
			const refresh = async () => {
				setDetecting(true);
				setDetectError("");
				const answer = await dataActions.listEditors();
				setDetecting(false);
				if (!answer.ok) setDetectError(answer.error ?? "detection failed");
			};
			return (0, react_jsx_runtime.jsxs)("div", {
				className: DevDockSettingsPage_module_css_default.page,
				children: [
					(0, react_jsx_runtime.jsx)("h2", {
						className: DevDockSettingsPage_module_css_default.heading,
						children: t("settings.workspacePref.title")
					}),
					(0, react_jsx_runtime.jsx)("p", {
						className: DevDockSettingsPage_module_css_default.hint,
						children: t("settings.workspacePref.hint")
					}),
					workspaces.length === 0 && (0, react_jsx_runtime.jsx)("p", {
						className: DevDockSettingsPage_module_css_default.hint,
						children: t("start.noWorkspace")
					}),
					(0, react_jsx_runtime.jsx)("ul", {
						className: DevDockSettingsPage_module_css_default.rows,
						children: workspaces.map((workspace) => (0, react_jsx_runtime.jsxs)("li", {
							className: DevDockSettingsPage_module_css_default.row,
							children: [(0, react_jsx_runtime.jsx)("span", {
								className: DevDockSettingsPage_module_css_default.name,
								children: workspace.title || workspace.path
							}), (0, react_jsx_runtime.jsx)(WorkspaceEditorSelect, {
								value: prefOf(workspace.workspaceId),
								options: editorNames,
								onChange: (editor) => {
									setPref(workspace.workspaceId, editor);
								}
							})]
						}, workspace.workspaceId))
					}),
					(0, react_jsx_runtime.jsx)("h2", {
						className: DevDockSettingsPage_module_css_default.heading,
						children: t("settings.editors.title")
					}),
					(0, react_jsx_runtime.jsx)("p", {
						className: DevDockSettingsPage_module_css_default.hint,
						children: t("settings.editors.hint")
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						className: DevDockSettingsPage_module_css_default.refreshRow,
						children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							size: "sm",
							variant: "outline",
							onClick: () => {
								refresh();
							},
							disabled: detecting,
							children: detecting ? `${t("settings.editors.refresh")}…` : t("settings.editors.refresh")
						}), detectError !== "" && (0, react_jsx_runtime.jsx)("span", {
							className: DevDockSettingsPage_module_css_default.error,
							role: "alert",
							children: detectError
						})]
					}),
					(0, react_jsx_runtime.jsx)("ul", {
						className: DevDockSettingsPage_module_css_default.rows,
						children: editorNames.map((name) => {
							const editor = editors.find((e) => e.name === name);
							const manual = editor?.manualPath;
							const detected = editor?.detectedPath ?? "";
							const draft = drafts[name] ?? manual ?? detected;
							return (0, react_jsx_runtime.jsxs)("li", {
								className: DevDockSettingsPage_module_css_default.editorRow,
								children: [
									(0, react_jsx_runtime.jsxs)("span", {
										className: `${DevDockSettingsPage_module_css_default.name} ${DevDockSettingsPage_module_css_default.editorName}`,
										children: [iconFailed[name] ? (0, react_jsx_runtime.jsx)(DevIdeIcon, { size: 16 }) : (0, react_jsx_runtime.jsx)("img", {
											className: DevDockSettingsPage_module_css_default.editorIcon,
											src: `/dev-dock/editor-icon?editor=${encodeURIComponent(name)}`,
											alt: "",
											onError: () => {
												setIconFailed((current) => ({
													...current,
													[name]: true
												}));
											}
										}), (0, react_jsx_runtime.jsx)("span", {
											className: DevDockSettingsPage_module_css_default.editorLabel,
											children: name
										})]
									}),
									(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
										className: DevDockSettingsPage_module_css_default.editorInput,
										value: draft,
										placeholder: t("settings.editors.manual"),
										onChange: (event) => {
											setDrafts((current) => ({
												...current,
												[name]: event.target.value
											}));
										}
									}),
									(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										size: "sm",
										variant: "outline",
										className: DevDockSettingsPage_module_css_default.editorSave,
										onClick: () => {
											saveManual(name, draft);
										},
										children: t("settings.editors.save")
									})
								]
							}, name);
						})
					}),
					(0, react_jsx_runtime.jsx)("h2", {
						className: DevDockSettingsPage_module_css_default.heading,
						children: t("settings.terminal.title")
					}),
					TERMINAL_APPS.map(({ key, labelKey }) => {
						const failed = iconFailed[key];
						return (0, react_jsx_runtime.jsxs)("label", {
							className: DevDockSettingsPage_module_css_default.radioRow,
							children: [
								(0, react_jsx_runtime.jsx)("input", {
									type: "radio",
									name: "dev-dock-terminal",
									checked: (settings?.terminalApp ?? "default") === key,
									onChange: () => {
										dataActions.setTerminalApp(key);
									}
								}),
								failed ? (0, react_jsx_runtime.jsx)(DevTerminalIcon, { size: 16 }) : (0, react_jsx_runtime.jsx)("img", {
									className: DevDockSettingsPage_module_css_default.editorIcon,
									src: `/dev-dock/terminal-icon?app=${key}`,
									alt: "",
									onError: () => {
										setIconFailed((current) => ({
											...current,
											[key]: true
										}));
									}
								}),
								(0, react_jsx_runtime.jsx)("span", { children: t(labelKey) })
							]
						}, key);
					})
				]
			});
		}
		/** Terminal preference options with their icon route keys. */
		const TERMINAL_APPS = [{
			key: "default",
			labelKey: "settings.terminal.default"
		}, {
			key: "iterm",
			labelKey: "settings.terminal.iterm"
		}];
		//#endregion
		//#region lib/types/client/locales.js
		/**
		* devDock v2 browser copy: entry row, start-work dialog, per-session header
		* actions (IDE / terminal / start), and the settings page. Simplified from
		* v1: projects are dsh workspaces; desktop actions are deterministic.
		* @module @liyuera/dsh-dev-dock/client/locales
		*/
		/** devDock dictionary keys. */
		const NS = "devDock";
		/** zh dict. */
		const zh = {
			"start.button": "开始上班",
			"start.notice": "选择要启动的工作区项目（记住上次选择）",
			"start.confirm": "启动",
			"start.cancel": "取消",
			"start.running": "正在启动…",
			"start.done": "已打开 {opened} 个编辑器、{started} 个终端窗口",
			"start.empty": "没有可用的工作区项目",
			"start.noWorkspace": "请先在工作区添加项目",
			"header.ide": "用 IDE 打开",
			"header.terminal": "打开系统终端",
			"header.start": "启动（IDE + 终端）",
			"header.noWorkspace": "当前会话没有关联工作区",
			"header.error": "操作失败：{error}",
			"settings.title": "devDock",
			"settings.workspacePref.title": "工作区编辑器偏好",
			"settings.workspacePref.hint": "给每个工作区选择打开用的 IDE；不选则按内容自动检测（uni-app → HBuilderX，其它 → WebStorm）。",
			"settings.editors.title": "编辑器",
			"settings.editors.refresh": "重新检测",
			"settings.editors.manual": "手动路径",
			"settings.editors.save": "保存",
			"settings.editors.hint": "检测不到或需要指定时，可手动填写（如 HBuilderX）。",
			"settings.terminal.title": "终端",
			"settings.terminal.default": "Terminal.app（默认）",
			"settings.terminal.iterm": "iTerm2"
		};
		/** en dict. */
		const en = {
			"start.button": "Start Work",
			"start.notice": "Select workspace projects to start (last selection remembered)",
			"start.confirm": "Start",
			"start.cancel": "Cancel",
			"start.running": "Starting…",
			"start.done": "Opened {opened} editor(s) and {started} terminal(s)",
			"start.empty": "No workspace projects available",
			"start.noWorkspace": "Add projects in the workspace area first",
			"header.ide": "Open in IDE",
			"header.terminal": "Open system terminal",
			"header.start": "Start (IDE + terminal)",
			"header.noWorkspace": "This session has no associated workspace",
			"header.error": "Action failed: {error}",
			"settings.title": "devDock",
			"settings.workspacePref.title": "Workspace editor preference",
			"settings.workspacePref.hint": "Pick the IDE each workspace opens with; auto-detected when unset (uni-app → HBuilderX, other → WebStorm).",
			"settings.editors.title": "Editors",
			"settings.editors.refresh": "Re-detect",
			"settings.editors.manual": "Manual path",
			"settings.editors.save": "Save",
			"settings.editors.hint": "Set a manual path when detection misses (e.g. HBuilderX).",
			"settings.terminal.title": "Terminal",
			"settings.terminal.default": "Terminal.app (default)",
			"settings.terminal.iterm": "iTerm2"
		};
		//#endregion
		//#region lib/types/client/index.js
		/** Required services for data binding and slot contributions. */
		const inject = [
			"slots",
			"locale",
			"settingsScope"
		];
		/**
		* Client plugin body: register dictionaries and every surface entry.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "dev-dock: dictionaries");
			const t = ctx.locale.bind(NS);
			const view = createDevDockStore();
			const data = createDevDockData(ctx);
			const dataHandle = data.store;
			const dataActions = data.actions;
			const modalInjected = () => ({
				hooks: { devDockData: dataHandle },
				dataActions
			});
			const footerInjected = () => ({ hooks: { devDockData: dataHandle } });
			ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
				name: "sidebar.footer.action",
				id: "dev-dock-start",
				order: 5,
				locale: NS,
				store: view,
				inject: footerInjected
			}, StartWorkButton));
			const composerInjected = () => ({
				dataActions,
				hooks: { devDockData: dataHandle }
			});
			ctx.slots.inject("conversation.input.right", () => ctx.slots.register({
				name: "conversation.input.right",
				id: "dev-dock-actions",
				order: 10,
				locale: NS,
				inject: composerInjected
			}, ComposerActions));
			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "dev-dock-start-modal",
				order: 300,
				locale: NS,
				store: view,
				inject: modalInjected
			}, StartWorkModal));
			const settingsInjected = () => ({
				hooks: { devDockData: dataHandle },
				dataActions
			});
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "dev-dock",
				order: 12,
				label: () => t("settings.title"),
				locale: NS,
				inject: settingsInjected
			}, DevDockSettingsPage));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map