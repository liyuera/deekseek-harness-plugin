window.__ModuleLoader__.load({
	id: "@liyuera/dsh-dev-dock",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_runtime_client = require("@deepseek-ai/dsh-client-runtime/client");
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
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
			const conversation = scoped.conversation;
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
		const css$4 = "._6B0Roq_row{border:1px solid var(--dsw-alias-border-subtle,#ffffff0f);width:100%;color:var(--dsw-alias-label-primary);cursor:pointer;background:0 0;border-radius:8px;justify-content:space-between;align-items:center;padding:8px 12px;transition:background .15s;display:flex}._6B0Roq_row:hover{background:var(--dsw-alias-bg-layer-2,#ffffff0a)}._6B0Roq_title{font-size:13px;font-weight:600}._6B0Roq_count{font-family:var(--dsw-font-mono,ui-monospace, monospace);color:var(--dsw-alias-label-tertiary);font-size:11px}._6B0Roq_railIcon{width:100%;color:var(--dsw-alias-label-primary);cursor:pointer;background:0 0;border:none;justify-content:center;align-items:center;padding:8px 0;display:inline-flex}._6B0Roq_railIcon:hover{color:var(--dsw-alias-accent,#6094ff)}._6B0Roq_railDot{background:var(--dsw-alias-accent,#6094ff);border-radius:50%;width:10px;height:10px}";
		const tagId$4 = "@liyuera/dsh-dev-dock/DevDockEntry.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$4) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@liyuera/dsh-dev-dock";
			tag.dataset.pluginCss = tagId$4;
			tag.textContent = css$4;
			document.head.appendChild(tag);
		}
		var DevDockEntry_module_css_default = {
			"count": "_6B0Roq_count",
			"railDot": "_6B0Roq_railDot",
			"title": "_6B0Roq_title",
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
		const css$3 = ".m4dz6G_page{flex-direction:column;gap:10px;height:100%;display:flex}.m4dz6G_header{justify-content:space-between;align-items:baseline;display:flex}.m4dz6G_title{margin:0;font-size:15px;font-weight:700}.m4dz6G_count{color:var(--dsw-alias-label-tertiary);font-size:11px}.m4dz6G_empty{text-align:center;color:var(--dsw-alias-label-tertiary);margin:24px 0;font-size:12px}.m4dz6G_list{flex-direction:column;gap:8px;margin:0;padding:0;list-style:none;display:flex}.m4dz6G_card{border:1px solid var(--dsw-alias-border-subtle,#ffffff0f);background:var(--dsw-alias-bg-layer-1,#ffffff05);border-radius:8px;padding:10px 12px}.m4dz6G_cardHeader{align-items:center;gap:8px;display:flex}.m4dz6G_name{text-overflow:ellipsis;white-space:nowrap;min-width:0;font-size:13px;font-weight:600;overflow:hidden}.m4dz6G_badge{background:var(--dsw-alias-state-success-muted,#34d3991f);color:var(--dsw-alias-state-success-primary,#34d399);border-radius:4px;flex:none;padding:1px 6px;font-size:10px}.m4dz6G_meta{font-family:var(--dsw-font-mono,ui-monospace, monospace);color:var(--dsw-alias-label-tertiary);gap:10px;margin-top:4px;font-size:10px;display:flex}.m4dz6G_cardActions{gap:6px;margin-top:8px;display:flex}.m4dz6G_action,.m4dz6G_actionDanger,.m4dz6G_importButton{border:1px solid var(--dsw-alias-border-subtle,#ffffff14);color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border-radius:6px;padding:4px 10px;font-size:11px}.m4dz6G_action:hover,.m4dz6G_importButton:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2,#ffffff0a)}.m4dz6G_actionDanger{color:var(--dsw-alias-state-danger-primary,#f87171);margin-left:auto}.m4dz6G_actionDanger:hover{background:var(--dsw-alias-state-danger-muted,#f871711f)}.m4dz6G_importButton{width:100%;margin-top:auto;padding:7px 10px}";
		const tagId$3 = "@liyuera/dsh-dev-dock/ProjectListPage.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$3) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@liyuera/dsh-dev-dock";
			tag.dataset.pluginCss = tagId$3;
			tag.textContent = css$3;
			document.head.appendChild(tag);
		}
		var ProjectListPage_module_css_default = {
			"header": "m4dz6G_header",
			"badge": "m4dz6G_badge",
			"action": "m4dz6G_action",
			"title": "m4dz6G_title",
			"cardHeader": "m4dz6G_cardHeader",
			"importButton": "m4dz6G_importButton",
			"name": "m4dz6G_name",
			"list": "m4dz6G_list",
			"card": "m4dz6G_card",
			"empty": "m4dz6G_empty",
			"actionDanger": "m4dz6G_actionDanger",
			"count": "m4dz6G_count",
			"meta": "m4dz6G_meta",
			"cardActions": "m4dz6G_cardActions",
			"page": "m4dz6G_page"
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
		const css$2 = "._2p8fxq_page{flex-direction:column;gap:10px;height:100%;display:flex}._2p8fxq_header{align-items:center;gap:8px;display:flex}._2p8fxq_field{flex-direction:column;flex:1;gap:4px;display:flex}._2p8fxq_label{color:var(--dsw-alias-label-tertiary);font-size:11px}._2p8fxq_input{border:1px solid var(--dsw-alias-border-subtle,#ffffff1a);background:var(--dsw-alias-bg-input,#ffffff0a);color:var(--dsw-alias-label-primary);border-radius:6px;outline:none;padding:6px 10px;font-size:12px}._2p8fxq_input:focus{border-color:var(--dsw-alias-accent,#6094ff)}._2p8fxq_headerActions{gap:6px;display:flex}._2p8fxq_action,._2p8fxq_actionPrimary{border:1px solid var(--dsw-alias-border-subtle,#ffffff14);cursor:pointer;border-radius:6px;padding:6px 12px;font-size:12px}._2p8fxq_action{color:var(--dsw-alias-label-secondary);background:0 0}._2p8fxq_actionPrimary{background:var(--dsw-alias-accent,#6094ff);color:#fff;border-color:#0000;font-weight:600}._2p8fxq_action:disabled,._2p8fxq_actionPrimary:disabled{opacity:.4;cursor:not-allowed}._2p8fxq_list{flex-direction:column;gap:8px;margin:0;padding:0;list-style:none;display:flex}._2p8fxq_card{border:1px solid var(--dsw-alias-border-subtle,#ffffff0f);background:var(--dsw-alias-bg-layer-1,#ffffff05);border-radius:8px;padding:10px 12px}._2p8fxq_cardHeader{align-items:center;gap:8px;display:flex}._2p8fxq_name{text-overflow:ellipsis;white-space:nowrap;min-width:0;font-size:13px;font-weight:600;overflow:hidden}._2p8fxq_remove{color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;margin-left:auto;font-size:13px}._2p8fxq_remove:hover{color:var(--dsw-alias-state-danger-primary,#f87171)}._2p8fxq_editorRow,._2p8fxq_scriptRow{flex-wrap:wrap;gap:6px;margin-top:8px;display:flex}._2p8fxq_chip,._2p8fxq_chipActive{border:1px solid var(--dsw-alias-border-subtle,#ffffff14);font-family:var(--dsw-font-mono,ui-monospace, monospace);color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border-radius:999px;padding:3px 9px;font-size:10px}._2p8fxq_chipActive{border-color:var(--dsw-alias-accent,#6094ff);background:var(--dsw-alias-accent-muted,#6094ff1f);color:var(--dsw-alias-accent,#6094ff)}._2p8fxq_empty{text-align:center;color:var(--dsw-alias-label-tertiary);margin:24px 0;font-size:12px}._2p8fxq_addButton{border:1px dashed var(--dsw-alias-border-subtle,#fff3);width:100%;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border-radius:6px;margin-top:auto;padding:7px 10px;font-size:12px}._2p8fxq_addButton:hover{color:var(--dsw-alias-label-primary)}._2p8fxq_pickerOverlay{z-index:100;background:#00000073;justify-content:center;align-items:center;display:flex;position:fixed;inset:0}._2p8fxq_picker{border:1px solid var(--dsw-alias-border-subtle,#ffffff1a);background:var(--dsw-alias-bg-overlay,#16181d);border-radius:10px;flex-direction:column;gap:8px;width:320px;max-height:70vh;padding:14px;display:flex;box-shadow:0 12px 40px #0006}._2p8fxq_pickerList{margin:0;padding:0;list-style:none;overflow-y:auto}._2p8fxq_pickerRow{text-align:left;width:100%;color:var(--dsw-alias-label-primary);cursor:pointer;background:0 0;border:none;border-radius:6px;padding:7px 10px;font-size:12px}._2p8fxq_pickerRow:hover{background:var(--dsw-alias-bg-layer-2,#ffffff0d)}._2p8fxq_pickerEmpty{text-align:center;color:var(--dsw-alias-label-tertiary);padding:10px;font-size:11px}._2p8fxq_hint{color:var(--dsw-alias-label-tertiary);font-size:11px}";
		const tagId$2 = "@liyuera/dsh-dev-dock/QuickStartPage.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$2) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@liyuera/dsh-dev-dock";
			tag.dataset.pluginCss = tagId$2;
			tag.textContent = css$2;
			document.head.appendChild(tag);
		}
		var QuickStartPage_module_css_default = {
			"chip": "_2p8fxq_chip",
			"headerActions": "_2p8fxq_headerActions",
			"header": "_2p8fxq_header",
			"empty": "_2p8fxq_empty",
			"pickerOverlay": "_2p8fxq_pickerOverlay",
			"pickerRow": "_2p8fxq_pickerRow",
			"picker": "_2p8fxq_picker",
			"addButton": "_2p8fxq_addButton",
			"cardHeader": "_2p8fxq_cardHeader",
			"scriptRow": "_2p8fxq_scriptRow",
			"pickerList": "_2p8fxq_pickerList",
			"label": "_2p8fxq_label",
			"chipActive": "_2p8fxq_chipActive",
			"editorRow": "_2p8fxq_editorRow",
			"pickerEmpty": "_2p8fxq_pickerEmpty",
			"hint": "_2p8fxq_hint",
			"action": "_2p8fxq_action",
			"remove": "_2p8fxq_remove",
			"field": "_2p8fxq_field",
			"page": "_2p8fxq_page",
			"input": "_2p8fxq_input",
			"name": "_2p8fxq_name",
			"actionPrimary": "_2p8fxq_actionPrimary",
			"list": "_2p8fxq_list",
			"card": "_2p8fxq_card"
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
						children: [(0, react_jsx_runtime.jsxs)("label", {
							className: QuickStartPage_module_css_default.field,
							children: [(0, react_jsx_runtime.jsx)("span", {
								className: QuickStartPage_module_css_default.label,
								children: t("drawer.tab.quickStart")
							}), (0, react_jsx_runtime.jsx)("input", {
								className: QuickStartPage_module_css_default.input,
								value: planName,
								placeholder: "plan name",
								onChange: (e) => {
									setPlanName(e.target.value);
								}
							})]
						}), (0, react_jsx_runtime.jsxs)("div", {
							className: QuickStartPage_module_css_default.headerActions,
							children: [(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: QuickStartPage_module_css_default.action,
								onClick: savePlan,
								disabled: planName.trim().length === 0,
								children: "保存"
							}), (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: QuickStartPage_module_css_default.actionPrimary,
								onClick: launch,
								disabled: draft.length === 0,
								children: "启动"
							})]
						})]
					}),
					draft.length === 0 ? (0, react_jsx_runtime.jsx)("p", {
						className: QuickStartPage_module_css_default.empty,
						children: "暂无项目，点击下方按钮添加"
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
						children: "+ 添加项目"
					}),
					showPicker && (0, react_jsx_runtime.jsx)("div", {
						className: QuickStartPage_module_css_default.pickerOverlay,
						role: "presentation",
						onClick: () => {
							setShowPicker(false);
						},
						children: (0, react_jsx_runtime.jsxs)("div", {
							className: QuickStartPage_module_css_default.picker,
							role: "dialog",
							"aria-modal": "true",
							onClick: (e) => {
								e.stopPropagation();
							},
							children: [
								(0, react_jsx_runtime.jsx)("input", {
									className: QuickStartPage_module_css_default.input,
									placeholder: "搜索项目...",
									value: query,
									onChange: (e) => {
										setQuery(e.target.value);
									},
									autoFocus: true
								}),
								(0, react_jsx_runtime.jsxs)("ul", {
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
										children: "没有可添加的项目"
									})]
								}),
								(0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: QuickStartPage_module_css_default.action,
									onClick: () => {
										setShowPicker(false);
									},
									children: "取消"
								})
							]
						})
					}),
					plans.length > 0 && activePlan === void 0 && planName !== "" && (0, react_jsx_runtime.jsxs)("p", {
						className: QuickStartPage_module_css_default.hint,
						children: [
							"方案 \"",
							planName,
							"\" 尚未保存，保存后生效"
						]
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-css:/Users/liyu/Documents/www/DeepSeek/deepseek-harness/deekseek-harness-plugin/dev-dock/src/client/pages/ImportPage.module.css.mjs
		const css$1 = ".Csy4Lq_page{flex-direction:column;gap:10px;display:flex}.Csy4Lq_title{margin:0;font-size:15px;font-weight:700}.Csy4Lq_desc{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.6}.Csy4Lq_field{flex-direction:column;gap:4px;display:flex}.Csy4Lq_label{color:var(--dsw-alias-label-tertiary);font-size:11px}.Csy4Lq_input{border:1px solid var(--dsw-alias-border-subtle,#ffffff1a);background:var(--dsw-alias-bg-input,#ffffff0a);color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-mono,ui-monospace, monospace);border-radius:6px;outline:none;padding:7px 10px;font-size:11px}.Csy4Lq_input:focus{border-color:var(--dsw-alias-accent,#6094ff)}.Csy4Lq_actionPrimary{background:var(--dsw-alias-accent,#6094ff);color:#fff;cursor:pointer;border:none;border-radius:6px;padding:7px 12px;font-size:12px;font-weight:600}.Csy4Lq_actionPrimary:disabled{opacity:.4;cursor:not-allowed}.Csy4Lq_hint{color:var(--dsw-alias-state-success-primary,#34d399);font-size:11px}";
		const tagId$1 = "@liyuera/dsh-dev-dock/ImportPage.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@liyuera/dsh-dev-dock";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var ImportPage_module_css_default = {
			"desc": "Csy4Lq_desc",
			"label": "Csy4Lq_label",
			"input": "Csy4Lq_input",
			"page": "Csy4Lq_page",
			"actionPrimary": "Csy4Lq_actionPrimary",
			"hint": "Csy4Lq_hint",
			"field": "Csy4Lq_field",
			"title": "Csy4Lq_title"
		};
		//#endregion
		//#region lib/types/client/pages/ImportPage.js
		/**
		* devDock import page: enter a directory and let the agent scan candidates,
		* analyze which are frontend projects, and present the save list for
		* confirmation. The analysis and saving run through agent tools.
		*/
		/**
		* Render the import page.
		* @param props - prompt channel and translator.
		* @returns the import form.
		*/
		function ImportPage({ promptAgent, t }) {
			const [dir, setDir] = (0, react.useState)("");
			const [sent, setSent] = (0, react.useState)(false);
			const start = () => {
				const target = dir.trim();
				if (target.length === 0) return;
				setSent(true);
				promptAgent(`使用 dev-dock_scan-candidates 扫描目录 ${target}，判断其中哪些候选是前端工程（node / uni-app / 小程序），为每个前端工程分析：类型、包管理器、Node 版本、scripts、构建命令、别名，然后逐个调用 dev-dock_save-project 保存。保存前先在对话中列出待保存清单让用户确认。`);
			};
			return (0, react_jsx_runtime.jsxs)("div", {
				className: ImportPage_module_css_default.page,
				children: [
					(0, react_jsx_runtime.jsx)("h2", {
						className: ImportPage_module_css_default.title,
						children: t("drawer.tab.import")
					}),
					(0, react_jsx_runtime.jsx)("p", {
						className: ImportPage_module_css_default.desc,
						children: "输入要导入的目录（目录本身或其直接子目录都会被扫描为候选工程），AI 将分析并列出待保存的前端工程清单。"
					}),
					(0, react_jsx_runtime.jsxs)("label", {
						className: ImportPage_module_css_default.field,
						children: [(0, react_jsx_runtime.jsx)("span", {
							className: ImportPage_module_css_default.label,
							children: "目录路径"
						}), (0, react_jsx_runtime.jsx)("input", {
							className: ImportPage_module_css_default.input,
							placeholder: "/Users/you/Documents/projects",
							value: dir,
							onChange: (e) => {
								setDir(e.target.value);
								setSent(false);
							}
						})]
					}),
					(0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: ImportPage_module_css_default.actionPrimary,
						onClick: start,
						disabled: dir.trim().length === 0 || sent,
						children: sent ? "已发送，请查看对话" : "开始分析"
					}),
					sent && (0, react_jsx_runtime.jsx)("p", {
						className: ImportPage_module_css_default.hint,
						children: "分析请求已发送给当前会话的 AI，请在对话中确认保存清单。"
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-css:/Users/liyu/Documents/www/DeepSeek/deepseek-harness/deekseek-harness-plugin/dev-dock/src/client/DevDockDrawer.module.css.mjs
		const css = "._63vEIa_root{z-index:90;position:fixed;inset:0}._63vEIa_mask{background:#0006;position:absolute;inset:0}._63vEIa_panel{background:var(--dsw-alias-bg-overlay,#16181d);border-left:1px solid var(--dsw-alias-border-subtle,#ffffff14);outline:none;flex-direction:column;width:380px;max-width:90vw;display:flex;position:absolute;top:0;bottom:0;right:0;box-shadow:-12px 0 32px #00000059}._63vEIa_tabs{border-bottom:1px solid var(--dsw-alias-border-subtle,#ffffff0f);align-items:center;gap:2px;padding:10px 12px 0;display:flex}._63vEIa_tab,._63vEIa_tabActive{cursor:pointer;background:0 0;border:none;border-radius:6px 6px 0 0;padding:7px 10px;font-size:12px}._63vEIa_tab{color:var(--dsw-alias-label-tertiary)}._63vEIa_tabActive{color:var(--dsw-alias-accent,#6094ff);box-shadow:inset 0 -2px 0 var(--dsw-alias-accent,#6094ff)}._63vEIa_close{color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;margin-left:auto;padding:4px 8px;font-size:15px}._63vEIa_close:hover{color:var(--dsw-alias-label-primary)}._63vEIa_content{flex:1;padding:12px;overflow-y:auto}";
		const tagId = "@liyuera/dsh-dev-dock/DevDockDrawer.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@liyuera/dsh-dev-dock";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var DevDockDrawer_module_css_default = {
			"close": "_63vEIa_close",
			"tabs": "_63vEIa_tabs",
			"tabActive": "_63vEIa_tabActive",
			"root": "_63vEIa_root",
			"content": "_63vEIa_content",
			"panel": "_63vEIa_panel",
			"tab": "_63vEIa_tab",
			"mask": "_63vEIa_mask"
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
		function DevDockDrawer({ useStore, actions: view, useDevDockData, actions, promptAgent, t }) {
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
				actions,
				promptAgent,
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
			"project.notFound": "项目不存在"
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
			"project.notFound": "Project not found"
		};
		//#endregion
		//#region lib/types/client/index.js
		/** Required services for data binding and slot contributions. */
		const inject = [
			"slots",
			"locale",
			"settingsScope",
			"sessions"
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
				actions: dataActions,
				promptAgent: (text) => dataActions.promptAgent(text)
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