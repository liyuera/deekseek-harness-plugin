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
		//#region lib/types/client/api.js
		/**
		* devDock browser data layer: binds the plugin's settings namespace through
		* the settingsScope service and exposes a snapshot store plus mutation
		* actions to the UI. Agent-facing actions (open IDE / terminal / quick-start)
		* are routed through the current session's prompt so the approval pipeline
		* and tool cards apply.
		* @module @liyuera/dsh-dev-dock/client/api
		*/
		/**
		* Create the devDock data layer for one client plugin fiber.
		* @param ctx - client root context (needs settingsScope, remote, connection).
		* @returns the data store and action facade.
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
					async saveProject(project) {
						const current = store.getSnapshot().settings;
						if (current === void 0) return;
						await write("projects", upsertLocal(current.projects, project));
					},
					async removeProject(projectId) {
						const current = store.getSnapshot().settings;
						if (current === void 0) return;
						const projects = current.projects.filter((p) => p.id !== projectId);
						const quickStarts = current.quickStarts.map((plan) => ({
							...plan,
							items: plan.items.filter((item) => item.projectId !== projectId)
						})).filter((plan) => plan.items.length > 0);
						await write("projects", projects);
						await write("quickStarts", quickStarts);
					},
					async setEditors(editors) {
						await write("editors", editors);
					},
					async setQuickStarts(plans) {
						await write("quickStarts", plans);
					},
					async setQuickStartPlan(plan) {
						const current = store.getSnapshot().settings;
						if (current === void 0) return;
						await write("quickStarts", current.quickStarts.find((p) => p.name === plan.name) ? current.quickStarts.map((p) => p.name === plan.name ? plan : p) : [...current.quickStarts, plan]);
					},
					async promptAgent(text) {
						return promptCurrentSession(ctx, text);
					}
				}
			};
		}
		/** Decode the wire section into the settings document (lenient cast). */
		function decodeSettings(section) {
			if (section === null || typeof section !== "object") return void 0;
			const doc = section;
			if (!Array.isArray(doc.projects) || !Array.isArray(doc.editors) || !Array.isArray(doc.quickStarts)) return;
			return {
				projects: doc.projects,
				editors: doc.editors,
				quickStarts: doc.quickStarts,
				terminalApp: doc.terminalApp === "iterm" ? "iterm" : "default"
			};
		}
		/** Local upsert mirroring the host-side semantics (path is the unique key). */
		function upsertLocal(projects, project) {
			const existing = projects.find((p) => p.path === project.path);
			const stored = {
				...project,
				id: existing?.id ?? String(Math.max(0, ...projects.map((p) => Number(p.id) || 0)) + 1),
				createdAt: existing?.createdAt ?? (/* @__PURE__ */ new Date()).toISOString()
			};
			return existing ? projects.map((p) => p.path === project.path ? stored : p) : [...projects, stored];
		}
		/**
		* Queue a user action through the current session's prompt so the agent
		* executes the matching dev-dock tool under the approval pipeline. Sends
		* through the ui-conversation service on the current session's scope.
		* @param ctx - client root context.
		* @param text - instruction text for the agent.
		* @returns true when a session accepted the prompt.
		*/
		async function promptCurrentSession(ctx, text) {
			const sessions = ctx.sessions;
			const current = sessions.list.getSnapshot().current;
			if (current === void 0) return false;
			const scoped = sessions.scope(current);
			if (scoped === void 0) return false;
			const conversation = scoped.get("conversation");
			if (conversation === void 0) return false;
			try {
				await conversation.send(text);
				return true;
			} catch {
				return false;
			}
		}
		//#endregion
		//#region lib/types/client/stores.js
		/**
		* devDock panel viewing store: drawer open state, active page, and the
		* selected project must survive entry/drawer remounts, so they live in one
		* store handle shared by the sidebar entry and the overlay drawer.
		* @module @liyuera/dsh-dev-dock/client/stores
		*/
		/**
		* Create the devDock panel viewing store.
		* @returns the store handle (spec + type + identity + factory in one).
		*/
		function createDevDockStore() {
			return (0, _deepseek_ai_dsh_client_runtime_client.defineStore)({
				init: () => ({
					open: false,
					page: "projects",
					selectedProjectId: void 0
				}),
				actions: {
					setOpen: (draft, open) => {
						draft.open = open;
					},
					setPage: (draft, page) => {
						draft.page = page;
					},
					setSelectedProject: (draft, projectId) => {
						draft.selectedProjectId = projectId;
					}
				}
			});
		}
		//#endregion
		//#region \0dsh-css:/Users/liyu/Documents/www/DeepSeek/deepseek-harness/deekseek-harness-plugin/dev-dock/src/client/DevDockEntry.module.css.mjs
		const css$4 = "._6B0Roq_row{width:100%;color:var(--dsw-alias-label-primary);cursor:pointer;text-align:left;transition:background var(--ds-transition-duration-fast) var(--ds-ease-in-out);background:0 0;border:none;border-radius:8px;justify-content:space-between;align-items:center;padding:7px 10px;display:flex}._6B0Roq_row:hover{background:var(--dsw-alias-interactive-bg-hover)}._6B0Roq_row:active{background:var(--dsw-alias-interactive-bg-active)}._6B0Roq_title{font-size:13px;font-weight:600;line-height:20px}._6B0Roq_count{color:var(--dsw-alias-label-secondary);font-size:11.5px;line-height:16px}._6B0Roq_railIcon{width:100%;color:var(--dsw-alias-label-secondary);cursor:pointer;transition:background var(--ds-transition-duration-fast) var(--ds-ease-in-out);background:0 0;border:none;border-radius:8px;justify-content:center;align-items:center;padding:8px 0;display:inline-flex}._6B0Roq_railIcon:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}._6B0Roq_railDot{background:var(--dsw-alias-state-business-primary);border-radius:50%;width:10px;height:10px}";
		const tagId$4 = "@liyuera/dsh-dev-dock/DevDockEntry.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$4) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@liyuera/dsh-dev-dock";
			tag.dataset.pluginCss = tagId$4;
			tag.textContent = css$4;
			document.head.appendChild(tag);
		}
		var DevDockEntry_module_css_default = {
			"title": "_6B0Roq_title",
			"railDot": "_6B0Roq_railDot",
			"count": "_6B0Roq_count",
			"row": "_6B0Roq_row",
			"railIcon": "_6B0Roq_railIcon"
		};
		//#endregion
		//#region lib/types/client/DevDockEntry.js
		/**
		* The sidebar footer entry row.
		* @param props - footer owner state, view store, data hook, translator.
		* @returns the entry button.
		*/
		function DevDockEntry({ wide, actions, useDevDockData, t }) {
			const count = useDevDockData((data) => data.settings?.projects.length ?? 0);
			const title = t("entry.title");
			if (!wide) return (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: DevDockEntry_module_css_default.railIcon,
				title,
				"aria-label": title,
				onClick: () => {
					actions.setOpen(true);
				},
				children: (0, react_jsx_runtime.jsx)("span", { className: DevDockEntry_module_css_default.railDot })
			});
			return (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				className: DevDockEntry_module_css_default.row,
				title: t("entry.open"),
				onClick: () => {
					actions.setOpen(true);
				},
				children: [(0, react_jsx_runtime.jsx)("span", {
					className: DevDockEntry_module_css_default.title,
					children: title
				}), (0, react_jsx_runtime.jsx)("span", {
					className: DevDockEntry_module_css_default.count,
					children: t("entry.projects", { count: String(count) })
				})]
			});
		}
		//#endregion
		//#region \0dsh-css:/Users/liyu/Documents/www/DeepSeek/deepseek-harness/deekseek-harness-plugin/dev-dock/src/client/pages/ProjectListPage.module.css.mjs
		const css$3 = ".m4dz6G_page{flex-direction:column;gap:10px;height:100%;display:flex}.m4dz6G_header{justify-content:space-between;align-items:baseline;display:flex}.m4dz6G_title{margin:0;font-size:14px;font-weight:600;line-height:22px}.m4dz6G_count{color:var(--dsw-alias-label-tertiary);font-size:11.5px;line-height:16px}.m4dz6G_empty{text-align:center;color:var(--dsw-alias-label-tertiary);margin:24px 0;font-size:12px;line-height:18px}.m4dz6G_list{flex-direction:column;gap:6px;margin:0;padding:0;list-style:none;display:flex}.m4dz6G_card{border:1px solid var(--dsw-alias-border-l1);transition:background var(--ds-transition-duration-fast) var(--ds-ease-in-out);background:0 0;border-radius:8px;padding:9px 10px}.m4dz6G_card:hover{background:var(--dsw-alias-interactive-bg-hover)}.m4dz6G_cardHeader{align-items:center;gap:8px;display:flex}.m4dz6G_name{text-overflow:ellipsis;white-space:nowrap;min-width:0;font-size:13px;font-weight:600;line-height:20px;overflow:hidden}.m4dz6G_badge{background:var(--dsw-alias-state-success-tertiary);color:var(--dsw-alias-state-success-primary);border-radius:5px;flex:none;padding:1px 6px;font-size:10px;line-height:15px}.m4dz6G_meta{color:var(--dsw-alias-label-tertiary);gap:10px;margin-top:3px;font-size:11px;line-height:16px;display:flex}.m4dz6G_cardActions{gap:4px;margin-top:7px;display:flex}.m4dz6G_action,.m4dz6G_actionDanger,.m4dz6G_importButton{color:var(--dsw-alias-label-secondary);cursor:pointer;transition:background var(--ds-transition-duration-fast) var(--ds-ease-in-out);background:0 0;border:none;border-radius:7px;padding:3px 10px;font-size:12px;line-height:18px}.m4dz6G_action:hover,.m4dz6G_importButton:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}.m4dz6G_action:active,.m4dz6G_importButton:active{background:var(--dsw-alias-interactive-bg-active)}.m4dz6G_actionDanger{color:var(--dsw-alias-state-error-primary);margin-left:auto}.m4dz6G_actionDanger:hover{color:var(--dsw-alias-state-error-primary);background:var(--dsw-alias-interactive-bg-hover-danger)}.m4dz6G_importButton{width:100%;margin-top:auto;padding:6px 10px}";
		const tagId$3 = "@liyuera/dsh-dev-dock/ProjectListPage.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$3) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@liyuera/dsh-dev-dock";
			tag.dataset.pluginCss = tagId$3;
			tag.textContent = css$3;
			document.head.appendChild(tag);
		}
		var ProjectListPage_module_css_default = {
			"name": "m4dz6G_name",
			"title": "m4dz6G_title",
			"badge": "m4dz6G_badge",
			"actionDanger": "m4dz6G_actionDanger",
			"header": "m4dz6G_header",
			"action": "m4dz6G_action",
			"meta": "m4dz6G_meta",
			"importButton": "m4dz6G_importButton",
			"cardActions": "m4dz6G_cardActions",
			"list": "m4dz6G_list",
			"card": "m4dz6G_card",
			"page": "m4dz6G_page",
			"cardHeader": "m4dz6G_cardHeader",
			"empty": "m4dz6G_empty",
			"count": "m4dz6G_count"
		};
		//#endregion
		//#region lib/types/client/pages/ProjectListPage.js
		/** Project kind label key. */
		const TYPE_KEYS = {
			node: "project.type.node",
			uniapp: "project.type.uniapp",
			miniapp: "project.type.miniapp"
		};
		/**
		* Render the projects page.
		* @param props - data hook, actions, navigator, translator.
		* @returns the project list.
		*/
		function ProjectListPage({ useDevDockData, actions, promptAgent, onNavigate, t }) {
			const settings = useDevDockData((data) => data.settings);
			const remove = async (project) => {
				if (!window.confirm(t("project.remove.confirm", { name: project.name }))) return;
				await actions.removeProject(project.id);
			};
			const openTerminal = (project) => {
				promptAgent(`使用 dev-dock_open-terminal 打开项目 ${project.name}（id=${project.id}）的终端`);
			};
			const openIde = (project) => {
				promptAgent(`使用 dev-dock_open-ide 用编辑器打开项目 ${project.name}（id=${project.id}）`);
			};
			return (0, react_jsx_runtime.jsxs)("div", {
				className: ProjectListPage_module_css_default.page,
				children: [
					(0, react_jsx_runtime.jsxs)("div", {
						className: ProjectListPage_module_css_default.header,
						children: [(0, react_jsx_runtime.jsx)("h2", {
							className: ProjectListPage_module_css_default.title,
							children: t("drawer.title")
						}), (0, react_jsx_runtime.jsx)("span", {
							className: ProjectListPage_module_css_default.count,
							children: t("entry.projects", { count: String(settings?.projects.length ?? 0) })
						})]
					}),
					settings === void 0 ? (0, react_jsx_runtime.jsx)("p", {
						className: ProjectListPage_module_css_default.empty,
						children: t("drawer.loading")
					}) : settings.projects.length === 0 ? (0, react_jsx_runtime.jsx)("p", {
						className: ProjectListPage_module_css_default.empty,
						children: t("projects.empty")
					}) : (0, react_jsx_runtime.jsx)("ul", {
						className: ProjectListPage_module_css_default.list,
						children: settings.projects.map((project) => (0, react_jsx_runtime.jsxs)("li", {
							className: ProjectListPage_module_css_default.card,
							children: [
								(0, react_jsx_runtime.jsxs)("div", {
									className: ProjectListPage_module_css_default.cardHeader,
									children: [(0, react_jsx_runtime.jsx)("span", {
										className: ProjectListPage_module_css_default.name,
										title: project.path,
										children: project.name
									}), (0, react_jsx_runtime.jsx)("span", {
										className: ProjectListPage_module_css_default.badge,
										children: t(TYPE_KEYS[project.type])
									})]
								}),
								(0, react_jsx_runtime.jsxs)("div", {
									className: ProjectListPage_module_css_default.meta,
									children: [(0, react_jsx_runtime.jsx)("span", {
										className: ProjectListPage_module_css_default.pm,
										children: project.packageManager
									}), (0, react_jsx_runtime.jsx)("span", {
										className: ProjectListPage_module_css_default.scripts,
										children: t("project.scripts", { count: String(Object.keys(project.scripts).length) })
									})]
								}),
								(0, react_jsx_runtime.jsxs)("div", {
									className: ProjectListPage_module_css_default.cardActions,
									children: [
										(0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: ProjectListPage_module_css_default.action,
											onClick: () => {
												openTerminal(project);
											},
											children: t("project.openTerminal")
										}),
										(0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: ProjectListPage_module_css_default.action,
											onClick: () => {
												openIde(project);
											},
											children: t("project.openIde")
										}),
										(0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: ProjectListPage_module_css_default.actionDanger,
											onClick: () => {
												remove(project);
											},
											children: t("project.remove")
										})
									]
								})
							]
						}, project.id))
					}),
					(0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: ProjectListPage_module_css_default.importButton,
						onClick: () => {
							onNavigate("import");
						},
						children: t("projects.import")
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-css:/Users/liyu/Documents/www/DeepSeek/deepseek-harness/deekseek-harness-plugin/dev-dock/src/client/pages/QuickStartPage.module.css.mjs
		const css$2 = "._2p8fxq_page{flex-direction:column;gap:10px;height:100%;display:flex}._2p8fxq_header{flex-direction:column;gap:6px;display:flex}._2p8fxq_controlRow{align-items:center;gap:8px;display:flex}._2p8fxq_label{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}._2p8fxq_input{flex:1;min-width:0}._2p8fxq_headerActions{gap:6px;display:flex}._2p8fxq_list{flex-direction:column;gap:6px;margin:0;padding:0;list-style:none;display:flex}._2p8fxq_card{border:1px solid var(--dsw-alias-border-l1);background:0 0;border-radius:8px;padding:9px 10px}._2p8fxq_cardHeader{align-items:center;gap:8px;display:flex}._2p8fxq_name{text-overflow:ellipsis;white-space:nowrap;min-width:0;font-size:13px;font-weight:600;line-height:20px;overflow:hidden}._2p8fxq_remove{color:var(--dsw-alias-label-tertiary);cursor:pointer;transition:background var(--ds-transition-duration-fast) var(--ds-ease-in-out);background:0 0;border:none;border-radius:6px;margin-left:auto;padding:0 6px;font-size:13px;line-height:20px}._2p8fxq_remove:hover{color:var(--dsw-alias-state-error-primary);background:var(--dsw-alias-interactive-bg-hover-danger)}._2p8fxq_editorRow,._2p8fxq_scriptRow{flex-wrap:wrap;gap:6px;margin-top:8px;display:flex}._2p8fxq_chip,._2p8fxq_chipActive{border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);cursor:pointer;transition:background var(--ds-transition-duration-fast) var(--ds-ease-in-out), border-color var(--ds-transition-duration-fast) var(--ds-ease-in-out);background:0 0;border-radius:8px;padding:3px 10px;font-size:11px;line-height:17px}._2p8fxq_chip:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}._2p8fxq_chipActive{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-multi-select);color:var(--dsw-alias-label-primary);font-weight:600}._2p8fxq_empty{text-align:center;color:var(--dsw-alias-label-tertiary);margin:24px 0;font-size:12px;line-height:18px}._2p8fxq_addButton{border:1px dashed var(--dsw-alias-border-l3);width:100%;color:var(--dsw-alias-label-secondary);cursor:pointer;transition:background var(--ds-transition-duration-fast) var(--ds-ease-in-out);background:0 0;border-radius:8px;margin-top:auto;padding:6px 10px;font-size:12px;line-height:18px}._2p8fxq_addButton:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}._2p8fxq_picker{flex-direction:column;gap:10px;min-height:220px;display:flex}._2p8fxq_pickerList{--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);margin:0;padding:0;list-style:none;overflow-y:auto}._2p8fxq_pickerRow{text-align:left;width:100%;color:var(--dsw-alias-label-primary);cursor:pointer;transition:background var(--ds-transition-duration-fast) var(--ds-ease-in-out);background:0 0;border:none;border-radius:8px;padding:7px 10px;font-size:13px;line-height:20px}._2p8fxq_pickerRow:hover{background:var(--dsw-alias-interactive-bg-hover)}._2p8fxq_pickerEmpty{text-align:center;color:var(--dsw-alias-label-tertiary);padding:10px;font-size:11px;line-height:16px}._2p8fxq_hint{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}";
		const tagId$2 = "@liyuera/dsh-dev-dock/QuickStartPage.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$2) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@liyuera/dsh-dev-dock";
			tag.dataset.pluginCss = tagId$2;
			tag.textContent = css$2;
			document.head.appendChild(tag);
		}
		var QuickStartPage_module_css_default = {
			"card": "_2p8fxq_card",
			"chipActive": "_2p8fxq_chipActive",
			"editorRow": "_2p8fxq_editorRow",
			"pickerEmpty": "_2p8fxq_pickerEmpty",
			"empty": "_2p8fxq_empty",
			"header": "_2p8fxq_header",
			"hint": "_2p8fxq_hint",
			"pickerRow": "_2p8fxq_pickerRow",
			"list": "_2p8fxq_list",
			"input": "_2p8fxq_input",
			"label": "_2p8fxq_label",
			"remove": "_2p8fxq_remove",
			"page": "_2p8fxq_page",
			"controlRow": "_2p8fxq_controlRow",
			"pickerList": "_2p8fxq_pickerList",
			"cardHeader": "_2p8fxq_cardHeader",
			"chip": "_2p8fxq_chip",
			"name": "_2p8fxq_name",
			"addButton": "_2p8fxq_addButton",
			"picker": "_2p8fxq_picker",
			"scriptRow": "_2p8fxq_scriptRow",
			"headerActions": "_2p8fxq_headerActions"
		};
		//#endregion
		//#region lib/types/client/pages/QuickStartPage.js
		/**
		* devDock quick-start page: edit named plans (projects with multi-selected
		* editors and one script each) and launch them through the agent.
		*/
		/** Editors offered for multi-selection. */
		const EDITOR_CHOICES = [
			"WebStorm",
			"VS Code",
			"IntelliJ IDEA",
			"Cursor",
			"Sublime Text",
			"HBuilderX"
		];
		/**
		* Render the quick-start page.
		* @param props - view store, data hook, actions, translator.
		* @returns the quick-start editor.
		*/
		function QuickStartPage({ useDevDockData, actions, promptAgent, t }) {
			const settings = useDevDockData((data) => data.settings);
			const projects = settings?.projects ?? [];
			const [planName, setPlanName] = (0, react.useState)(settings?.quickStarts[0]?.name ?? "");
			const [draft, setDraft] = (0, react.useState)(settings?.quickStarts[0]?.items ?? []);
			const [showPicker, setShowPicker] = (0, react.useState)(false);
			const [query, setQuery] = (0, react.useState)("");
			const plans = settings?.quickStarts ?? [];
			const activePlan = plans.find((p) => p.name === planName);
			const availableProjects = (0, react.useMemo)(() => {
				const added = new Set(draft.map((item) => item.projectId));
				return projects.filter((p) => !added.has(p.id));
			}, [projects, draft]);
			const toggleIde = (projectId, ide) => {
				setDraft((prev) => prev.map((item) => {
					if (item.projectId !== projectId) return item;
					const has = item.ides.includes(ide);
					return {
						...item,
						ides: has ? item.ides.filter((i) => i !== ide) : [...item.ides, ide]
					};
				}));
			};
			const selectScript = (projectId, script) => {
				setDraft((prev) => prev.map((item) => {
					if (item.projectId !== projectId) return item;
					const next = { ...item };
					if (item.script === script) delete next.script;
					else next.script = script;
					return next;
				}));
			};
			const removeItem = (projectId) => {
				setDraft((prev) => prev.filter((item) => item.projectId !== projectId));
			};
			const addItems = (ids) => {
				const items = ids.map((projectId) => ({
					projectId,
					ides: []
				}));
				setDraft((prev) => [...prev, ...items]);
				setShowPicker(false);
				setQuery("");
			};
			const savePlan = () => {
				if (planName.trim().length === 0) return;
				const plan = {
					name: planName.trim(),
					items: draft
				};
				actions.setQuickStartPlan(plan);
			};
			const launch = () => {
				const name = planName.trim();
				if (name.length === 0 || draft.length === 0) return;
				promptAgent(`使用 dev-dock_quick-start 执行一键启动方案 "${name}"`);
			};
			const projectById = (id) => projects.find((p) => p.id === id);
			return (0, react_jsx_runtime.jsxs)("div", {
				className: QuickStartPage_module_css_default.page,
				children: [
					(0, react_jsx_runtime.jsxs)("div", {
						className: QuickStartPage_module_css_default.header,
						children: [(0, react_jsx_runtime.jsx)("span", {
							className: QuickStartPage_module_css_default.label,
							children: t("quickStart.planName")
						}), (0, react_jsx_runtime.jsxs)("div", {
							className: QuickStartPage_module_css_default.controlRow,
							children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
								className: QuickStartPage_module_css_default.input,
								value: planName,
								placeholder: t("quickStart.planNamePlaceholder"),
								onChange: (e) => {
									setPlanName(e.target.value);
								}
							}), (0, react_jsx_runtime.jsxs)("div", {
								className: QuickStartPage_module_css_default.headerActions,
								children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									size: "sm",
									onClick: savePlan,
									disabled: planName.trim().length === 0,
									children: t("quickStart.save")
								}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									size: "sm",
									variant: "primary",
									onClick: launch,
									disabled: draft.length === 0,
									children: t("quickStart.launch")
								})]
							})]
						})]
					}),
					draft.length === 0 ? (0, react_jsx_runtime.jsx)("p", {
						className: QuickStartPage_module_css_default.empty,
						children: t("quickStart.empty")
					}) : (0, react_jsx_runtime.jsx)("ul", {
						className: QuickStartPage_module_css_default.list,
						children: draft.map((item) => {
							const project = projectById(item.projectId);
							if (project === void 0) return null;
							return (0, react_jsx_runtime.jsxs)("li", {
								className: QuickStartPage_module_css_default.card,
								children: [
									(0, react_jsx_runtime.jsxs)("div", {
										className: QuickStartPage_module_css_default.cardHeader,
										children: [(0, react_jsx_runtime.jsx)("span", {
											className: QuickStartPage_module_css_default.name,
											children: project.name
										}), (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: QuickStartPage_module_css_default.remove,
											"aria-label": `${t("quickStart.removeItem")} ${project.name}`,
											onClick: () => {
												removeItem(item.projectId);
											},
											children: "✕"
										})]
									}),
									(0, react_jsx_runtime.jsx)("div", {
										className: QuickStartPage_module_css_default.editorRow,
										children: EDITOR_CHOICES.map((ide) => {
											return (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: item.ides.includes(ide) ? QuickStartPage_module_css_default.chipActive : QuickStartPage_module_css_default.chip,
												onClick: () => {
													toggleIde(item.projectId, ide);
												},
												children: ide
											}, ide);
										})
									}),
									(0, react_jsx_runtime.jsx)("div", {
										className: QuickStartPage_module_css_default.scriptRow,
										children: Object.keys(project.scripts).map((script) => (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: item.script === script ? QuickStartPage_module_css_default.chipActive : QuickStartPage_module_css_default.chip,
											onClick: () => {
												selectScript(item.projectId, script);
											},
											children: script
										}, script))
									})
								]
							}, item.projectId);
						})
					}),
					(0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: QuickStartPage_module_css_default.addButton,
						onClick: () => {
							setShowPicker(true);
						},
						children: t("quickStart.addItem")
					}),
					(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: showPicker,
						onClose: () => {
							setShowPicker(false);
						},
						title: t("quickStart.addProject"),
						closeLabel: t("quickStart.cancel"),
						footer: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							onClick: () => {
								setShowPicker(false);
							},
							children: t("quickStart.cancel")
						}),
						children: (0, react_jsx_runtime.jsxs)("div", {
							className: QuickStartPage_module_css_default.picker,
							children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
								value: query,
								placeholder: t("quickStart.searchPlaceholder"),
								onChange: (e) => {
									setQuery(e.target.value);
								},
								autoFocus: true
							}), (0, react_jsx_runtime.jsxs)("ul", {
								className: QuickStartPage_module_css_default.pickerList,
								children: [availableProjects.filter((p) => query.trim().length === 0 || p.name.toLowerCase().includes(query.trim().toLowerCase())).map((p) => (0, react_jsx_runtime.jsx)("li", { children: (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: QuickStartPage_module_css_default.pickerRow,
									onClick: () => {
										addItems([p.id]);
									},
									children: p.name
								}) }, p.id)), availableProjects.length === 0 && (0, react_jsx_runtime.jsx)("li", {
									className: QuickStartPage_module_css_default.pickerEmpty,
									children: t("quickStart.noAvailable")
								})]
							})]
						})
					}),
					plans.length > 0 && activePlan === void 0 && planName !== "" && (0, react_jsx_runtime.jsx)("p", {
						className: QuickStartPage_module_css_default.hint,
						children: t("quickStart.unsaved", { name: planName })
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-css:/Users/liyu/Documents/www/DeepSeek/deepseek-harness/deekseek-harness-plugin/dev-dock/src/client/pages/ImportPage.module.css.mjs
		const css$1 = ".Csy4Lq_page{flex-direction:column;gap:8px;display:flex}.Csy4Lq_title{margin:0;font-size:14px;font-weight:600;line-height:22px}.Csy4Lq_desc{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}.Csy4Lq_label{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}.Csy4Lq_controlRow{align-items:center;gap:8px;display:flex}.Csy4Lq_input{cursor:pointer;flex:1;min-width:0}.Csy4Lq_startButton{align-self:flex-start;margin-top:4px}.Csy4Lq_hint{color:var(--dsw-alias-state-success-primary);font-size:11px;line-height:16px}.Csy4Lq_waiting{flex-direction:column;gap:10px;display:flex}.Csy4Lq_skeletonList{flex-direction:column;gap:6px;display:flex}.Csy4Lq_skeletonRow{background:var(--dsw-alias-bg-skeleton);border-radius:8px;height:52px;animation:1.2s ease-in-out infinite Csy4Lq_dsh-import-pulse}@keyframes Csy4Lq_dsh-import-pulse{0%,to{opacity:.5}50%{opacity:1}}.Csy4Lq_error{color:var(--dsw-alias-state-error-primary);font-size:11px;line-height:16px}";
		const tagId$1 = "@liyuera/dsh-dev-dock/ImportPage.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@liyuera/dsh-dev-dock";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var ImportPage_module_css_default = {
			"error": "Csy4Lq_error",
			"skeletonRow": "Csy4Lq_skeletonRow",
			"hint": "Csy4Lq_hint",
			"desc": "Csy4Lq_desc",
			"label": "Csy4Lq_label",
			"input": "Csy4Lq_input",
			"title": "Csy4Lq_title",
			"skeletonList": "Csy4Lq_skeletonList",
			"controlRow": "Csy4Lq_controlRow",
			"page": "Csy4Lq_page",
			"startButton": "Csy4Lq_startButton",
			"waiting": "Csy4Lq_waiting",
			"dsh-import-pulse": "Csy4Lq_dsh-import-pulse"
		};
		//#endregion
		//#region lib/types/client/pages/ImportPage.js
		/**
		* devDock import page: pick a directory through the system chooser and let
		* the agent scan candidates, analyze which are frontend projects, and
		* present the save list for confirmation. The analysis and saving run
		* through agent tools; the page shows a waiting skeleton and detects
		* completion through the project-registry count.
		*/
		/** Skeleton rows shown while the agent analyzes. */
		const SKELETON_ROWS = 3;
		/**
		* Render the import page.
		* @param props - prompt channel, directory picker, data hook, translator.
		* @returns the import form.
		*/
		function ImportPage({ useDevDockData, promptAgent, pickDirectory, t }) {
			const settings = useDevDockData((data) => data.settings);
			const [dir, setDir] = (0, react.useState)("");
			const [status, setStatus] = (0, react.useState)("idle");
			const [error, setError] = (0, react.useState)("");
			const [savedCount, setSavedCount] = (0, react.useState)(0);
			const [picking, setPicking] = (0, react.useState)(false);
			const baseCountRef = (0, react.useRef)(0);
			const pick = async () => {
				setPicking(true);
				try {
					const path = await pickDirectory();
					if (path !== null) {
						setDir(path);
						setStatus("idle");
						setError("");
					}
				} finally {
					setPicking(false);
				}
			};
			const start = async () => {
				const target = dir.trim();
				if (target.length === 0) return;
				baseCountRef.current = settings?.projects.length ?? 0;
				if (!await promptAgent(`使用 dev-dock_scan-candidates 扫描目录 ${target}，判断其中哪些候选是前端工程（node / uni-app / 小程序），为每个前端工程分析：类型、包管理器、Node 版本、scripts、构建命令、别名，然后逐个调用 dev-dock_save-project 保存。保存前先在对话中列出待保存清单让用户确认。`)) {
					setStatus("error");
					setError(t("import.noSession"));
					return;
				}
				setStatus("waiting");
			};
			(0, react.useEffect)(() => {
				if (status !== "waiting") return;
				const count = settings?.projects.length ?? 0;
				if (count > baseCountRef.current) {
					setSavedCount(count - baseCountRef.current);
					setStatus("done");
				}
			}, [settings, status]);
			const busy = status === "waiting";
			return (0, react_jsx_runtime.jsxs)("div", {
				className: ImportPage_module_css_default.page,
				children: [
					(0, react_jsx_runtime.jsx)("h2", {
						className: ImportPage_module_css_default.title,
						children: t("drawer.tab.import")
					}),
					(0, react_jsx_runtime.jsx)("p", {
						className: ImportPage_module_css_default.desc,
						children: "选择一个目录（目录本身或其直接子目录都会被扫描为候选工程），AI 将分析并列出待保存的前端工程清单。"
					}),
					(0, react_jsx_runtime.jsx)("span", {
						className: ImportPage_module_css_default.label,
						children: t("import.dirLabel")
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						className: ImportPage_module_css_default.controlRow,
						children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
							className: ImportPage_module_css_default.input,
							value: dir,
							readOnly: true,
							placeholder: t("import.noDir"),
							onClick: pick
						}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							size: "sm",
							variant: "outline",
							onClick: pick,
							disabled: picking || busy,
							children: t("import.pickDir")
						})]
					}),
					(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						size: "sm",
						variant: "primary",
						className: ImportPage_module_css_default.startButton,
						onClick: () => {
							start();
						},
						disabled: dir.trim().length === 0 || busy,
						children: t("import.start")
					}),
					status === "waiting" && (0, react_jsx_runtime.jsxs)("div", {
						className: ImportPage_module_css_default.waiting,
						role: "status",
						children: [(0, react_jsx_runtime.jsx)("div", {
							className: ImportPage_module_css_default.skeletonList,
							children: Array.from({ length: SKELETON_ROWS }).map((_, i) => (0, react_jsx_runtime.jsx)("div", { className: ImportPage_module_css_default.skeletonRow }, i))
						}), (0, react_jsx_runtime.jsx)("p", {
							className: ImportPage_module_css_default.hint,
							children: t("import.waiting")
						})]
					}),
					status === "done" && (0, react_jsx_runtime.jsx)("p", {
						className: ImportPage_module_css_default.hint,
						role: "status",
						children: t("import.done", { count: String(savedCount) })
					}),
					status === "error" && (0, react_jsx_runtime.jsx)("p", {
						className: ImportPage_module_css_default.error,
						role: "alert",
						children: error
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-css:/Users/liyu/Documents/www/DeepSeek/deepseek-harness/deekseek-harness-plugin/dev-dock/src/client/DevDockDrawer.module.css.mjs
		const css = "._63vEIa_root{z-index:90;position:fixed;inset:0}._63vEIa_mask{background:var(--dsw-alias-bg-mask-2);position:absolute;inset:0}._63vEIa_panel{background:var(--dsw-specific-sidebar-fill);border-left:1px solid var(--dsw-alias-border-l1);width:360px;max-width:92vw;color:var(--dsw-alias-label-primary);outline:none;flex-direction:column;font-size:13px;line-height:20px;display:flex;position:absolute;top:0;bottom:0;right:0;box-shadow:-8px 0 24px #00000024}._63vEIa_tabs{border-bottom:1px solid var(--dsw-alias-border-l1);flex:none;align-items:center;gap:2px;padding:10px 12px 0;display:flex}._63vEIa_tab,._63vEIa_tabActive{cursor:pointer;transition:background var(--ds-transition-duration-fast) var(--ds-ease-in-out);background:0 0;border:none;border-radius:8px 8px 0 0;padding:6px 10px;font-size:12px;line-height:18px}._63vEIa_tab{color:var(--dsw-alias-label-tertiary)}._63vEIa_tab:hover{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-interactive-bg-hover)}._63vEIa_tabActive{color:var(--dsw-alias-label-primary);box-shadow:inset 0 -2px 0 var(--dsw-alias-brand-primary);font-weight:600}._63vEIa_close{color:var(--dsw-alias-label-secondary);cursor:pointer;transition:background var(--ds-transition-duration-fast) var(--ds-ease-in-out);background:0 0;border:none;border-radius:6px;margin-left:auto;padding:2px 6px;font-size:14px;line-height:20px}._63vEIa_close:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2)}._63vEIa_content{--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);flex:1;padding:12px;overflow:hidden auto}";
		const tagId = "@liyuera/dsh-dev-dock/DevDockDrawer.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@liyuera/dsh-dev-dock";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var DevDockDrawer_module_css_default = {
			"root": "_63vEIa_root",
			"mask": "_63vEIa_mask",
			"tab": "_63vEIa_tab",
			"panel": "_63vEIa_panel",
			"tabs": "_63vEIa_tabs",
			"close": "_63vEIa_close",
			"tabActive": "_63vEIa_tabActive",
			"content": "_63vEIa_content"
		};
		//#endregion
		//#region lib/types/client/DevDockDrawer.js
		/**
		* devDock overlay drawer: a right-docked panel with page tabs (projects,
		* quick-start, import). Rendered into `shell.overlay`; open state rides the
		* shared viewing store.
		*/
		/** Page tabs with their locale keys. */
		const TABS = [
			{
				page: "projects",
				key: "drawer.tab.projects"
			},
			{
				page: "quickStart",
				key: "drawer.tab.quickStart"
			},
			{
				page: "import",
				key: "drawer.tab.import"
			}
		];
		/**
		* The devDock overlay drawer.
		* @param props - overlay runtime, view store, data hook, actions, translator.
		* @returns the drawer panel, or null when closed.
		*/
		function DevDockDrawer({ useStore, actions: view, useDevDockData, dataActions, promptAgent, pickDirectory, t }) {
			const { open, page } = useStore((state) => state);
			const panelRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				if (!open) return;
				const onKeyDown = (e) => {
					if (e.key === "Escape") view.setOpen(false);
				};
				document.addEventListener("keydown", onKeyDown);
				panelRef.current?.focus();
				return () => {
					document.removeEventListener("keydown", onKeyDown);
				};
			}, [open, view]);
			if (!open) return null;
			const navigate = (page) => {
				view.setPage(page);
			};
			const pageProps = {
				useDevDockData,
				actions: dataActions,
				promptAgent,
				pickDirectory,
				t,
				onNavigate: navigate
			};
			return (0, react_jsx_runtime.jsxs)("div", {
				className: DevDockDrawer_module_css_default.root,
				role: "presentation",
				children: [(0, react_jsx_runtime.jsx)("div", {
					className: DevDockDrawer_module_css_default.mask,
					"aria-hidden": "true",
					onClick: () => {
						view.setOpen(false);
					}
				}), (0, react_jsx_runtime.jsxs)("div", {
					ref: panelRef,
					className: DevDockDrawer_module_css_default.panel,
					role: "dialog",
					"aria-modal": "true",
					"aria-label": t("drawer.title"),
					tabIndex: -1,
					children: [(0, react_jsx_runtime.jsxs)("nav", {
						className: DevDockDrawer_module_css_default.tabs,
						"aria-label": t("drawer.title"),
						children: [TABS.map((tab) => (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: tab.page === page ? DevDockDrawer_module_css_default.tabActive : DevDockDrawer_module_css_default.tab,
							"aria-current": tab.page === page ? "true" : void 0,
							onClick: () => {
								view.setPage(tab.page);
							},
							children: t(tab.key)
						}, tab.page)), (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: DevDockDrawer_module_css_default.close,
							"aria-label": t("drawer.close"),
							onClick: () => {
								view.setOpen(false);
							},
							children: "×"
						})]
					}), (0, react_jsx_runtime.jsxs)("div", {
						className: DevDockDrawer_module_css_default.content,
						children: [
							page === "projects" && (0, react_jsx_runtime.jsx)(ProjectListPage, { ...pageProps }),
							page === "quickStart" && (0, react_jsx_runtime.jsx)(QuickStartPage, { ...pageProps }),
							page === "import" && (0, react_jsx_runtime.jsx)(ImportPage, { ...pageProps })
						]
					})]
				})]
			});
		}
		//#endregion
		//#region lib/types/client/locales.js
		/** `devDock` dictionary namespace. */
		/** Dictionary namespace owned by this plugin. */
		const NS = "devDock";
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"entry.title": "devDock",
			"entry.projects": "{count} 个项目",
			"entry.open": "打开 devDock",
			"drawer.aria": "devDock 面板",
			"drawer.title": "devDock",
			"drawer.close": "关闭",
			"drawer.tab.projects": "项目",
			"drawer.tab.quickStart": "一键启动",
			"drawer.tab.import": "导入",
			"drawer.loading": "加载中...",
			"drawer.unavailable": "数据不可用",
			"projects.empty": "暂无项目，点击\"导入\"添加",
			"projects.import": "导入",
			"project.type.node": "Node",
			"project.type.uniapp": "UniApp",
			"project.type.miniapp": "小程序",
			"project.scripts": "{count} 个脚本",
			"project.openTerminal": "终端",
			"project.openIde": "打开",
			"project.remove": "删除",
			"project.remove.confirm": "确认删除项目「{name}」？仅移除插件配置，不删除磁盘文件。",
			"project.notFound": "项目不存在",
			"quickStart.save": "保存",
			"quickStart.launch": "启动",
			"quickStart.planName": "方案名称",
			"quickStart.planNamePlaceholder": "plan name",
			"quickStart.empty": "暂无项目，点击下方按钮添加",
			"quickStart.addItem": "添加项目",
			"quickStart.addProject": "添加项目到方案",
			"quickStart.searchPlaceholder": "搜索项目...",
			"quickStart.noAvailable": "没有可添加的项目",
			"quickStart.cancel": "取消",
			"quickStart.unsaved": "方案「{name}」尚未保存，保存后生效",
			"quickStart.removeItem": "移除项目",
			"import.pickDir": "选择目录",
			"import.noDir": "未选择目录",
			"import.dirLabel": "目录路径",
			"import.start": "开始分析",
			"import.sent": "已发送，请查看对话",
			"import.sentHint": "分析请求已发送给当前会话的 AI，请在对话中确认保存清单。",
			"import.waiting": "AI 正在分析目录，保存清单将出现在对话中...",
			"import.noSession": "未找到活跃会话，请先在左侧打开一个会话，再重新分析",
			"import.done": "已保存 {count} 个新项目，可在项目页查看"
		};
		/** English dictionary. */
		const en = {
			"entry.title": "devDock",
			"entry.projects": "{count} projects",
			"entry.open": "Open devDock",
			"drawer.aria": "devDock panel",
			"drawer.title": "devDock",
			"drawer.close": "Close",
			"drawer.tab.projects": "Projects",
			"drawer.tab.quickStart": "Quick Start",
			"drawer.tab.import": "Import",
			"drawer.loading": "Loading...",
			"drawer.unavailable": "Data unavailable",
			"projects.empty": "No projects yet — click Import to add one",
			"projects.import": "Import",
			"project.type.node": "Node",
			"project.type.uniapp": "UniApp",
			"project.type.miniapp": "Miniapp",
			"project.scripts": "{count} scripts",
			"project.openTerminal": "Terminal",
			"project.openIde": "Open",
			"project.remove": "Remove",
			"project.remove.confirm": "Remove project \"{name}\"? Only the plugin configuration is removed; files on disk are untouched.",
			"project.notFound": "Project not found",
			"quickStart.save": "Save",
			"quickStart.launch": "Launch",
			"quickStart.planName": "Plan name",
			"quickStart.planNamePlaceholder": "plan name",
			"quickStart.empty": "No items yet — use the button below to add",
			"quickStart.addItem": "Add project",
			"quickStart.addProject": "Add projects to plan",
			"quickStart.searchPlaceholder": "Search projects...",
			"quickStart.noAvailable": "No projects available to add",
			"quickStart.cancel": "Cancel",
			"quickStart.unsaved": "Plan \"{name}\" is not saved yet — save to activate",
			"quickStart.removeItem": "Remove item",
			"import.pickDir": "Choose directory",
			"import.noDir": "No directory chosen",
			"import.dirLabel": "Directory",
			"import.start": "Start analysis",
			"import.sent": "Sent — check the conversation",
			"import.sentHint": "The analysis request was sent to the current session; confirm the save list in the conversation.",
			"import.waiting": "AI is analyzing the directory; the save list will appear in the conversation...",
			"import.noSession": "No active session — open one in the sidebar first, then analyze again",
			"import.done": "Saved {count} new projects — see the Projects tab"
		};
		//#endregion
		//#region lib/types/client/index.js
		/** Required services for data binding and slot contributions. */
		const inject = [
			"slots",
			"locale",
			"settingsScope",
			"sessions",
			"workspaces"
		];
		/**
		* Client plugin body: register dictionaries and both surface entries.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "dev-dock: dictionaries");
			const view = createDevDockStore();
			const { store: dataStore, actions: dataActions } = createDevDockData(ctx);
			const entryInjected = () => ({ hooks: { devDockData: dataStore } });
			const drawerInjected = () => ({
				hooks: { devDockData: dataStore },
				dataActions,
				promptAgent: (text) => dataActions.promptAgent(text),
				pickDirectory: () => ctx.workspaces.pickDirectory()
			});
			ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
				name: "sidebar.footer.action",
				id: "dev-dock",
				order: 10,
				locale: NS,
				store: view,
				inject: entryInjected
			}, DevDockEntry));
			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "dev-dock-drawer",
				order: 100,
				locale: NS,
				store: view,
				inject: drawerInjected
			}, DevDockDrawer));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map