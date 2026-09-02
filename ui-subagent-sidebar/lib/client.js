window.__ModuleLoader__.load({
	id: "@liyuera/dsh-client-ui-subagent-sidebar",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react = require("react");
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		//#region \0dsh-css:/Users/liyu/Documents/www/DeepSeek/deepseek-harness/deekseek-harness-plugin/ui-subagent-sidebar/src/client/SubagentSidebarCapsule.module.css.mjs
		const css$1 = ".xcC1pq_capsule{border:1px solid var(--dsw-alias-state-success-primary);background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);cursor:pointer;border-radius:999px;align-items:center;gap:8px;padding:9px 14px;font-size:13px;font-weight:600;animation:.25s ease-out xcC1pq_dsh-sa-pop;display:inline-flex;position:fixed;bottom:20px;right:20px;box-shadow:0 6px 24px #0000002e}.xcC1pq_capsule:hover{background:var(--dsw-alias-bg-layer-2)}.xcC1pq_dot{flex:none}@keyframes xcC1pq_dsh-sa-pop{0%{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}";
		const tagId$1 = "@liyuera/dsh-client-ui-subagent-sidebar/SubagentSidebarCapsule.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@liyuera/dsh-client-ui-subagent-sidebar";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var SubagentSidebarCapsule_module_css_default = {
			"capsule": "xcC1pq_capsule",
			"dot": "xcC1pq_dot",
			"dsh-sa-pop": "xcC1pq_dsh-sa-pop"
		};
		//#endregion
		//#region lib/types/client/SubagentSidebarCapsule.js
		/**
		* Frame-wide running-count capsule: one entry in `shell.overlay` that shows
		* how many subagent sessions are running anywhere, and opens the overview
		* panel on click. Renders nothing when nothing runs, so an idle host keeps
		* the corner clean.
		* @param props - overlay runtime hooks, shared store, translator.
		* @returns the capsule button, or null when no subagent is running.
		*/
		function SubagentSidebarCapsule({ useSessions, actions, t }) {
			const runningCount = useSessions((state) => Object.values(state.byId).filter((summary) => summary.origin === "subagent" && summary.running).length);
			if (runningCount === 0) return null;
			const countKey = runningCount === 1 ? "capsule.label.one" : "capsule.label.other";
			return (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				className: SubagentSidebarCapsule_module_css_default.capsule,
				title: t("capsule.title"),
				onClick: () => {
					actions.setOpen(true);
				},
				children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
					state: "ongoing",
					className: SubagentSidebarCapsule_module_css_default.dot
				}), (0, react_jsx_runtime.jsx)("span", { children: t(countKey, { count: String(runningCount) }) })]
			});
		}
		//#endregion
		//#region node_modules/clsx/dist/clsx.mjs
		function r(e) {
			var t, f, n = "";
			if ("string" == typeof e || "number" == typeof e) n += e;
			else if ("object" == typeof e) if (Array.isArray(e)) {
				var o = e.length;
				for (t = 0; t < o; t++) e[t] && (f = r(e[t])) && (n && (n += " "), n += f);
			} else for (f in e) e[f] && (n && (n += " "), n += f);
			return n;
		}
		function clsx() {
			for (var e, t, f = 0, n = "", o = arguments.length; f < o; f++) (e = arguments[f]) && (t = r(e)) && (n && (n += " "), n += t);
			return n;
		}
		//#endregion
		//#region lib/types/client/subagent-lineage.js
		/**
		* UI Subagent Sidebar-owned projection of descendant counts from Session
		* summaries. The same fold exists in the harness packages ui-subagent and
		* ui-workspace (each feature projects its own view; feature plugins never
		* runtime-import one another's values), so this plugin carries its copy.
		*/
		/**
		* Index uninterrupted subagent descendants under each ancestor.
		* @param summaries - Session summaries keyed by id.
		* @returns descendant totals keyed by possible parent id.
		*/
		function indexSubagentDescendants(summaries) {
			const indexed = /* @__PURE__ */ new Map();
			for (const descendant of Object.values(summaries)) {
				if (descendant.origin !== "subagent") continue;
				const seen = /* @__PURE__ */ new Set();
				let current = descendant;
				while (current?.origin === "subagent" && current.parentId !== void 0 && !seen.has(current.id)) {
					seen.add(current.id);
					const aggregate = indexed.get(current.parentId);
					if (aggregate === void 0) indexed.set(current.parentId, {
						count: 1,
						runningCount: descendant.running ? 1 : 0
					});
					else {
						aggregate.count += 1;
						if (descendant.running) aggregate.runningCount += 1;
					}
					current = summaries[current.parentId];
				}
			}
			return indexed;
		}
		//#endregion
		//#region \0dsh-css:/Users/liyu/Documents/www/DeepSeek/deepseek-harness/deekseek-harness-plugin/ui-subagent-sidebar/src/client/SubagentSidebarPanel.module.css.mjs
		const css = ".A6Sknq_panel{z-index:999;background:var(--dsw-specific-sidebar-fill);border-left:1px solid var(--dsw-alias-border-l1);width:340px;max-width:92vw;color:var(--dsw-alias-label-primary);flex-direction:column;font-size:13px;display:flex;position:fixed;top:0;bottom:0;right:0;overflow:hidden;box-shadow:-8px 0 24px #00000024}.A6Sknq_head{border-bottom:1px solid var(--dsw-alias-border-l1);flex:none;align-items:center;gap:10px;padding:12px 14px;display:flex}.A6Sknq_title{font-weight:600}.A6Sknq_counts{color:var(--dsw-alias-label-secondary);gap:8px;font-size:11.5px;display:inline-flex}.A6Sknq_close{color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:4px;margin-left:auto;padding:2px 6px;font-size:14px}.A6Sknq_close:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2)}.A6Sknq_filter{border-bottom:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);cursor:pointer;flex:none;align-items:center;gap:5px;padding:8px 14px;font-size:12px;display:inline-flex}.A6Sknq_body{--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);flex:1;padding:6px 0;overflow:hidden auto}.A6Sknq_root{border-bottom:1px solid var(--dsw-alias-border-l1)}.A6Sknq_root:last-child{border-bottom:none}.A6Sknq_rootHead{box-sizing:border-box;cursor:pointer;width:100%;color:var(--dsw-alias-label-primary);text-align:left;background:0 0;border:none;align-items:center;gap:8px;padding:9px 12px;font-size:12.5px;font-weight:600;display:flex}.A6Sknq_rootHead:hover{background:var(--dsw-alias-bg-layer-1)}.A6Sknq_rootHead:focus-visible,.A6Sknq_row:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}.A6Sknq_chevron{width:14px;color:var(--dsw-alias-label-secondary);flex:none;transition:transform .15s}.A6Sknq_chevronOpen{transform:rotate(90deg)}.A6Sknq_rootTitle{text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;overflow:hidden}.A6Sknq_badge{color:var(--dsw-alias-label-secondary);border:1px solid var(--dsw-alias-border-l1);border-radius:4px;flex:none;padding:0 4px;font-size:10px}.A6Sknq_rootCounts{color:var(--dsw-alias-label-secondary);flex:none;gap:6px;font-size:11px;font-weight:400;display:inline-flex}.A6Sknq_runningCount{color:var(--dsw-alias-state-success-primary)}.A6Sknq_row{box-sizing:border-box;cursor:pointer;width:100%;color:var(--dsw-alias-label-primary);text-align:left;align-items:flex-start;gap:8px;padding:8px 12px;font-size:12.5px;display:flex}.A6Sknq_row:hover{background:var(--dsw-alias-bg-layer-1)}.A6Sknq_rowArchived{opacity:.65}.A6Sknq_disabled{cursor:default;color:var(--dsw-alias-label-secondary)}.A6Sknq_disclosure{width:18px;height:18px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:4px;flex:none;justify-content:center;align-items:center;margin-top:1px;padding:0;transition:transform .15s;display:inline-flex}.A6Sknq_disclosure:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2)}.A6Sknq_disclosureOpen{transform:rotate(90deg)}.A6Sknq_disclosureSpace{flex:none;width:18px}.A6Sknq_content{flex-direction:column;flex:1;gap:2px;min-width:0;display:flex}.A6Sknq_labelRow{align-items:center;gap:6px;min-width:0;display:flex}.A6Sknq_label{text-overflow:ellipsis;white-space:nowrap;font-weight:600;overflow:hidden}.A6Sknq_summary{color:var(--dsw-alias-label-secondary);text-overflow:ellipsis;white-space:nowrap;font-size:11.5px;overflow:hidden}.A6Sknq_metrics{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);border-radius:4px;align-self:flex-start;padding:1px 5px;font-size:10.5px}.A6Sknq_empty,.A6Sknq_notice{color:var(--dsw-alias-label-secondary);text-align:center;padding:16px 14px;font-size:12px}";
		const tagId = "@liyuera/dsh-client-ui-subagent-sidebar/SubagentSidebarPanel.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@liyuera/dsh-client-ui-subagent-sidebar";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var SubagentSidebarPanel_module_css_default = {
			"badge": "A6Sknq_badge",
			"body": "A6Sknq_body",
			"chevron": "A6Sknq_chevron",
			"chevronOpen": "A6Sknq_chevronOpen",
			"close": "A6Sknq_close",
			"content": "A6Sknq_content",
			"counts": "A6Sknq_counts",
			"disabled": "A6Sknq_disabled",
			"disclosure": "A6Sknq_disclosure",
			"disclosureOpen": "A6Sknq_disclosureOpen",
			"disclosureSpace": "A6Sknq_disclosureSpace",
			"empty": "A6Sknq_empty",
			"filter": "A6Sknq_filter",
			"head": "A6Sknq_head",
			"label": "A6Sknq_label",
			"labelRow": "A6Sknq_labelRow",
			"metrics": "A6Sknq_metrics",
			"notice": "A6Sknq_notice",
			"panel": "A6Sknq_panel",
			"root": "A6Sknq_root",
			"rootCounts": "A6Sknq_rootCounts",
			"rootHead": "A6Sknq_rootHead",
			"rootTitle": "A6Sknq_rootTitle",
			"row": "A6Sknq_row",
			"rowArchived": "A6Sknq_rowArchived",
			"runningCount": "A6Sknq_runningCount",
			"summary": "A6Sknq_summary",
			"title": "A6Sknq_title"
		};
		//#endregion
		//#region lib/types/client/SubagentSidebarPanel.js
		/** Compact token count shared in shape with the conversation stats strip. */
		function formatTokens(value) {
			const scaled = (next) => next >= 100 ? String(Math.round(next)) : String(Math.round(next * 10) / 10);
			if (value < 1e3) return String(value);
			if (value < 1e6) return `${scaled(value / 1e3)}K`;
			return `${scaled(value / 1e6)}M`;
		}
		/** Sum the four disjoint durable provider-usage buckets. */
		function tokenTotal(summary) {
			const usage = summary?.projectionValues?.tokenUsage;
			return usage === void 0 ? void 0 : usage.uncachedInputTokens + usage.outputTokens + usage.cacheReadTokens + usage.cacheWriteTokens;
		}
		/** Exact whole-second active-turn duration for one catalog row. */
		function activityDuration(summary, activity, now) {
			if (summary === void 0) return void 0;
			const timing = summary.projectionValues?.subagentTiming;
			if (timing === void 0) return void 0;
			if (timing.active === void 0) return timing.settledMs;
			const end = activity === "running" ? now : timing.active.through;
			return timing.settledMs + Math.max(0, end - timing.active.since);
		}
		/** Human activity word for the row summary line. */
		function activityLabel(activity, t) {
			return activity === "running" ? t("row.running") : t("row.notRunning");
		}
		/** Dot semantics mirror the official catalog: driver running vs settled. */
		function dotState(activity) {
			return activity === "running" ? "ongoing" : "done";
		}
		/**
		* Frame-wide subagent overview panel: every root session's direct subagent
		* catalog, grouped under collapsible root headers that are independent of
		* each other. Rows follow the official catalog layout — state dot, label,
		* `title · mode · activity` secondary line, token/duration metrics — and
		* branches expand lazily through the catalog mirror like the shipped header
		* action. Opening the panel subscribes every root's catalog; closing
		* unsubscribes all of them.
		* @param props - overlay runtime hooks, store share, catalog actions, translator.
		* @returns the panel, or null while closed.
		*/
		function SubagentSidebarPanel({ useSessions, useWorkspaces, useStore, actions, openChild, refresh, setCatalogOpen, t }) {
			const byId = useSessions((state) => state.byId);
			const catalogs = useSessions((state) => state.subagentsByParent);
			const archivedSessionIds = useWorkspaces((state) => state.archivedSessionIds);
			const { open, collapsedRoots, collapsedNodes, onlyRunning } = useStore((state) => state);
			const [now, setNow] = (0, react.useState)(() => Date.now());
			const roots = (0, react.useMemo)(() => Object.values(byId).filter((summary) => summary.origin !== "subagent" && summary.parentId === void 0).sort((a, b) => a.displayTitle.localeCompare(b.displayTitle)), [byId]);
			const descendants = (0, react.useMemo)(() => indexSubagentDescendants(byId), [byId]);
			const archived = (0, react.useMemo)(() => new Set(archivedSessionIds), [archivedSessionIds]);
			(0, react.useEffect)(() => {
				if (!open) return;
				for (const root of roots) {
					setCatalogOpen(root.id, true);
					refresh(root.id);
				}
				return () => {
					for (const root of roots) setCatalogOpen(root.id, false);
				};
			}, [
				open,
				roots,
				setCatalogOpen,
				refresh
			]);
			(0, react.useEffect)(() => {
				if (!open) return;
				if (!Object.values(byId).some((summary) => summary.origin === "subagent" && summary.running)) return;
				setNow(Date.now());
				const timer = setInterval(() => {
					setNow(Date.now());
				}, 1e3);
				return () => {
					clearInterval(timer);
				};
			}, [open, byId]);
			if (!open) return null;
			const onKeyDown = (event) => {
				const items = Array.from(event.currentTarget.querySelectorAll("[role=\"treeitem\"]:not([aria-disabled=\"true\"])"));
				const index = items.indexOf(event.target);
				let next = -1;
				if (event.key === "ArrowDown") next = index + 1;
				else if (event.key === "ArrowUp") next = index - 1;
				else if (event.key === "Home") next = 0;
				else if (event.key === "End") next = items.length - 1;
				else if (event.key === "Escape") {
					event.preventDefault();
					actions.setOpen(false);
					return;
				}
				if (next >= 0 && next < items.length) {
					event.preventDefault();
					items[next]?.focus();
				}
			};
			const shared = {
				byId,
				catalogs,
				descendants,
				archived,
				onlyRunning,
				now,
				openChild,
				refresh,
				setCatalogOpen,
				actions,
				t
			};
			const totalSubagents = Object.values(byId).filter((summary) => summary.origin === "subagent").length;
			const runningSubagents = Object.values(byId).filter((summary) => summary.origin === "subagent" && summary.running).length;
			return (0, react_jsx_runtime.jsxs)("aside", {
				className: SubagentSidebarPanel_module_css_default.panel,
				"aria-label": t("panel.aria"),
				onKeyDown,
				children: [
					(0, react_jsx_runtime.jsxs)("div", {
						className: SubagentSidebarPanel_module_css_default.head,
						children: [
							(0, react_jsx_runtime.jsx)("span", {
								className: SubagentSidebarPanel_module_css_default.title,
								children: t("panel.title")
							}),
							(0, react_jsx_runtime.jsxs)("span", {
								className: SubagentSidebarPanel_module_css_default.counts,
								children: [(0, react_jsx_runtime.jsx)("span", { children: t("panel.total", { total: String(totalSubagents) }) }), (0, react_jsx_runtime.jsx)("span", { children: t("panel.running", { running: String(runningSubagents) }) })]
							}),
							(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: SubagentSidebarPanel_module_css_default.close,
								title: t("panel.close"),
								onClick: () => {
									actions.setOpen(false);
								},
								children: "✕"
							})
						]
					}),
					(0, react_jsx_runtime.jsxs)("label", {
						className: SubagentSidebarPanel_module_css_default.filter,
						children: [(0, react_jsx_runtime.jsx)("input", {
							type: "checkbox",
							checked: onlyRunning,
							onChange: (event) => {
								actions.setOnlyRunning(event.target.checked);
							}
						}), t("filter.runningOnly")]
					}),
					(0, react_jsx_runtime.jsx)("div", {
						className: SubagentSidebarPanel_module_css_default.body,
						children: roots.length === 0 ? (0, react_jsx_runtime.jsx)("div", {
							className: SubagentSidebarPanel_module_css_default.empty,
							children: t("panel.empty")
						}) : roots.map((root) => (0, react_jsx_runtime.jsx)(RootGroup, {
							root,
							shared,
							collapsedRoots,
							collapsedNodes
						}, root.id))
					})
				]
			});
		}
		/** One root session's group: header row plus its lazy subagent catalog tree. */
		function RootGroup({ root, shared, collapsedRoots, collapsedNodes }) {
			const { byId, catalogs, descendants, archived, onlyRunning, actions, t } = shared;
			const total = descendants.get(root.id)?.count ?? 0;
			const running = descendants.get(root.id)?.runningCount ?? 0;
			const isCollapsed = collapsedRoots.includes(root.id);
			const countKey = total === 1 ? "root.count.one" : "root.count.other";
			const renderChildren = (parentSessionId, level) => {
				const entries = catalogs[parentSessionId]?.entries ?? [];
				const visible = onlyRunning ? entries.filter((entry) => entry.kind === "child" && byId[entry.id]?.running) : entries;
				return (0, react_jsx_runtime.jsx)("div", {
					role: "group",
					children: visible.map((entry) => (0, react_jsx_runtime.jsx)(CatalogRow, {
						entry,
						parentSessionId,
						level,
						shared,
						collapsedNodes
					}, entry.id))
				});
			};
			return (0, react_jsx_runtime.jsxs)("section", {
				className: SubagentSidebarPanel_module_css_default.root,
				children: [(0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: SubagentSidebarPanel_module_css_default.rootHead,
					"aria-expanded": !isCollapsed,
					"aria-label": t(isCollapsed ? "root.expand" : "root.collapse", { title: root.displayTitle }),
					onClick: () => {
						actions.toggleRoot(root.id);
					},
					children: [
						(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, { className: clsx(SubagentSidebarPanel_module_css_default.chevron, !isCollapsed && SubagentSidebarPanel_module_css_default.chevronOpen) }),
						(0, react_jsx_runtime.jsx)("span", {
							className: SubagentSidebarPanel_module_css_default.rootTitle,
							children: root.displayTitle
						}),
						archived.has(root.id) && (0, react_jsx_runtime.jsx)("span", {
							className: SubagentSidebarPanel_module_css_default.badge,
							children: t("row.archived")
						}),
						(0, react_jsx_runtime.jsxs)("span", {
							className: SubagentSidebarPanel_module_css_default.rootCounts,
							children: [(0, react_jsx_runtime.jsx)("span", { children: t(countKey, { count: String(total) }) }), running > 0 && (0, react_jsx_runtime.jsx)("span", {
								className: SubagentSidebarPanel_module_css_default.runningCount,
								children: t("root.runningCount", { count: String(running) })
							})]
						})
					]
				}), !isCollapsed && renderChildren(root.id, 1)]
			});
		}
		/** One catalog row: dot, label, secondary, metrics, and a lazy disclosure. */
		function CatalogRow({ entry, parentSessionId, level, shared, collapsedNodes }) {
			const { byId, catalogs, archived, onlyRunning, now, openChild, actions, t } = shared;
			if (entry.kind === "diagnostic") return (0, react_jsx_runtime.jsxs)("div", {
				role: "treeitem",
				"aria-disabled": "true",
				"aria-level": level,
				className: clsx(SubagentSidebarPanel_module_css_default.row, SubagentSidebarPanel_module_css_default.disabled),
				children: [
					(0, react_jsx_runtime.jsx)("span", { className: SubagentSidebarPanel_module_css_default.disclosureSpace }),
					(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: "error" }),
					(0, react_jsx_runtime.jsx)("span", {
						className: SubagentSidebarPanel_module_css_default.content,
						children: (0, react_jsx_runtime.jsx)("span", {
							className: SubagentSidebarPanel_module_css_default.label,
							children: entry.id
						})
					})
				]
			});
			const summary = byId[entry.id];
			const label = entry.label ?? entry.id;
			const isCollapsed = collapsedNodes.includes(entry.id);
			const mode = entry.mode === "continuable" ? t("row.continuable") : t("row.oneShot");
			const secondary = [
				summary?.title,
				mode,
				activityLabel(entry.activity, t)
			].filter((value) => value !== void 0).join(" · ");
			const totalTokens = tokenTotal(summary);
			const durationMs = activityDuration(summary, entry.activity, now);
			const metrics = [totalTokens === void 0 ? void 0 : `${formatTokens(totalTokens)} tok`, durationMs === void 0 ? void 0 : formatDuration(durationMs, t)].filter((value) => value !== void 0).join(" · ");
			const open = () => {
				openChild(parentSessionId, entry.id, entry.mode);
			};
			const handleKey = (event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					event.stopPropagation();
					open();
				} else if (event.key === "ArrowRight" && entry.hasChildren && isCollapsed || event.key === "ArrowLeft" && entry.hasChildren && !isCollapsed) {
					event.preventDefault();
					event.stopPropagation();
					actions.toggleNode(entry.id);
				}
			};
			const toggle = (event) => {
				event.preventDefault();
				event.stopPropagation();
				actions.toggleNode(entry.id);
			};
			return (0, react_jsx_runtime.jsxs)("div", { children: [(0, react_jsx_runtime.jsxs)("div", {
				role: "treeitem",
				tabIndex: 0,
				"aria-level": level,
				"aria-expanded": entry.hasChildren ? !isCollapsed : void 0,
				className: clsx(SubagentSidebarPanel_module_css_default.row, archived.has(entry.id) && SubagentSidebarPanel_module_css_default.rowArchived),
				onClick: open,
				onKeyDown: handleKey,
				children: [
					entry.hasChildren ? (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						tabIndex: -1,
						className: clsx(SubagentSidebarPanel_module_css_default.disclosure, !isCollapsed && SubagentSidebarPanel_module_css_default.disclosureOpen),
						"aria-label": t(isCollapsed ? "row.expand" : "row.collapse"),
						onClick: toggle,
						children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, {})
					}) : (0, react_jsx_runtime.jsx)("span", { className: SubagentSidebarPanel_module_css_default.disclosureSpace }),
					(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: dotState(entry.activity) }),
					(0, react_jsx_runtime.jsxs)("span", {
						className: SubagentSidebarPanel_module_css_default.content,
						children: [
							(0, react_jsx_runtime.jsxs)("span", {
								className: SubagentSidebarPanel_module_css_default.labelRow,
								children: [(0, react_jsx_runtime.jsx)("span", {
									className: SubagentSidebarPanel_module_css_default.label,
									children: label
								}), archived.has(entry.id) && (0, react_jsx_runtime.jsx)("span", {
									className: SubagentSidebarPanel_module_css_default.badge,
									children: t("row.archived")
								})]
							}),
							(0, react_jsx_runtime.jsx)("span", {
								className: SubagentSidebarPanel_module_css_default.summary,
								children: secondary
							}),
							metrics !== "" && (0, react_jsx_runtime.jsx)("span", {
								className: SubagentSidebarPanel_module_css_default.metrics,
								children: metrics
							})
						]
					})
				]
			}), entry.hasChildren && !isCollapsed && (0, react_jsx_runtime.jsx)("div", {
				role: "group",
				children: (catalogs[entry.id]?.entries ?? []).filter((child) => !onlyRunning || child.kind === "child" && byId[child.id]?.running).map((child) => (0, react_jsx_runtime.jsx)(CatalogRow, {
					entry: child,
					parentSessionId: entry.id,
					level: level + 1,
					shared,
					collapsedNodes
				}, child.id))
			})] });
		}
		/** Format a duration with decreasing visual precision at larger scales. */
		function formatDuration(ms, t) {
			const totalSeconds = Math.floor(Math.max(0, ms) / 1e3);
			const totalMinutes = Math.floor(totalSeconds / 60);
			const totalHours = Math.floor(totalMinutes / 60);
			const seconds = totalSeconds % 60;
			const minutes = totalMinutes % 60;
			const hours = totalHours % 24;
			const days = Math.floor(totalHours / 24);
			if (days >= 365) {
				const years = Math.floor(days / 365);
				const months = Math.floor(days % 365 / 30);
				return months === 0 ? t("duration.years", { years }) : t("duration.yearsMonths", {
					years,
					months
				});
			}
			if (days >= 30) {
				const months = Math.floor(days / 30);
				const remainingDays = days % 30;
				return remainingDays === 0 ? t("duration.months", { months }) : t("duration.monthsDays", {
					months,
					days: remainingDays
				});
			}
			if (days > 0) return hours === 0 ? t("duration.days", { days }) : t("duration.daysHours", {
				days,
				hours
			});
			if (totalHours > 0) return t("duration.hours", {
				hours,
				minutes: String(minutes).padStart(2, "0"),
				seconds: String(seconds).padStart(2, "0")
			});
			if (totalMinutes > 0) return t("duration.minutes", {
				minutes: totalMinutes,
				seconds: String(seconds).padStart(2, "0")
			});
			return t("duration.seconds", { seconds });
		}
		//#endregion
		//#region lib/types/client/stores.js
		/**
		* Panel viewing store shared by the capsule and the panel: open state must
		* survive either entry's remount, and the expansion/filter state should
		* survive closing and reopening the panel. Module level exports the factory
		* only; apply() instantiates one handle and passes it to both registrations.
		*
		* Collapse sets are plain arrays: the immer-backed store engine has no
		* MapSet plugin, so mutable Set state is not draft-safe.
		*/
		/** Toggle one id in a collapse array. */
		function toggle(list, id) {
			return list.includes(id) ? list.filter((candidate) => candidate !== id) : [...list, id];
		}
		/**
		* Create the subagent overview store handle.
		* @returns the store handle (spec + type + identity + factory in one).
		*/
		function createSubagentSidebarStore() {
			return (0, _deepseek_ai_dsh_client_store.defineStore)({
				init: () => ({
					open: false,
					collapsedRoots: [],
					collapsedNodes: [],
					onlyRunning: false
				}),
				actions: {
					setOpen: (draft, open) => {
						draft.open = open;
					},
					toggleRoot: (draft, rootId) => {
						draft.collapsedRoots = toggle(draft.collapsedRoots, rootId);
					},
					toggleNode: (draft, nodeId) => {
						draft.collapsedNodes = toggle(draft.collapsedNodes, nodeId);
					},
					setOnlyRunning: (draft, onlyRunning) => {
						draft.onlyRunning = onlyRunning;
					}
				}
			});
		}
		//#endregion
		//#region lib/types/client/locales.js
		/** `subagentSidebar` namespace dictionaries. */
		/** Dictionary namespace owned by this plugin. */
		const NS = "subagentSidebar";
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"capsule.title": "有子代理正在运行，点击查看",
			"capsule.label.one": "{count} 个子代理运行中",
			"capsule.label.other": "{count} 个子代理运行中",
			"panel.aria": "子代理总览",
			"panel.title": "子代理",
			"panel.total": "共 {total} 个",
			"panel.running": "运行中 {running}",
			"panel.close": "关闭",
			"panel.empty": "暂无子代理",
			"filter.runningOnly": "仅显示运行中",
			"root.count.one": "{count} 个子代理",
			"root.count.other": "{count} 个子代理",
			"root.runningCount": "{count} 个运行中",
			"root.expand": "展开 {title} 下的子代理",
			"root.collapse": "收起 {title} 下的子代理",
			"row.running": "正在运行",
			"row.idle": "空闲",
			"row.notRunning": "当前未运行",
			"row.continuable": "可继续",
			"row.oneShot": "一次性",
			"row.archived": "已归档",
			"row.expand": "展开下级子代理",
			"row.collapse": "收起下级子代理",
			"duration.exactTitle": "总活跃耗时：{duration}",
			"duration.seconds": "{seconds}秒",
			"duration.minutes": "{minutes}分{seconds}秒",
			"duration.hours": "{hours}小时{minutes}分{seconds}秒",
			"duration.days": "{days}天",
			"duration.daysHours": "{days}天{hours}小时",
			"duration.months": "约{months}个月",
			"duration.monthsDays": "约{months}个月{days}天",
			"duration.years": "约{years}年",
			"duration.yearsMonths": "约{years}年{months}个月",
			"duration.exactDays": "{days}天{hours}小时{minutes}分{seconds}秒"
		};
		/** English dictionary, key-identical to the Chinese source of truth. */
		const en = {
			"capsule.title": "Subagents running, click to view",
			"capsule.label.one": "{count} subagent running",
			"capsule.label.other": "{count} subagents running",
			"panel.aria": "Subagent overview",
			"panel.title": "Subagents",
			"panel.total": "{total} total",
			"panel.running": "{running} running",
			"panel.close": "Close",
			"panel.empty": "No subagents",
			"filter.runningOnly": "Running only",
			"root.count.one": "{count} subagent",
			"root.count.other": "{count} subagents",
			"root.runningCount": "{count} running",
			"root.expand": "Expand subagents under {title}",
			"root.collapse": "Collapse subagents under {title}",
			"row.running": "running",
			"row.idle": "idle",
			"row.notRunning": "not running",
			"row.continuable": "continuable",
			"row.oneShot": "one-shot",
			"row.archived": "archived",
			"row.expand": "Expand descendants",
			"row.collapse": "Collapse descendants",
			"duration.exactTitle": "Total active duration: {duration}",
			"duration.seconds": "{seconds}s",
			"duration.minutes": "{minutes}m {seconds}s",
			"duration.hours": "{hours}h {minutes}m {seconds}s",
			"duration.days": "{days}d",
			"duration.daysHours": "{days}d {hours}h",
			"duration.months": "~{months}mo",
			"duration.monthsDays": "~{months}mo {days}d",
			"duration.years": "~{years}y",
			"duration.yearsMonths": "~{years}y {months}mo",
			"duration.exactDays": "{days}d {hours}h {minutes}m {seconds}s"
		};
		//#endregion
		//#region lib/types/client/index.js
		/** Required services for catalog refresh and slot contributions. */
		const inject = [
			"sessions",
			"slots",
			"locale"
		];
		/**
		* Client plugin body: register the dictionaries and both overlay entries.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-subagent-sidebar: dictionaries");
			const sessions = ctx.sessions;
			const store = createSubagentSidebarStore();
			const panelInjected = () => ({
				openChild(parentSessionId, childSessionId, mode) {
					sessions.openSubagent({
						parentSessionId,
						childSessionId,
						mode
					});
				},
				refresh(parentSessionId) {
					sessions.refreshSubagents(parentSessionId);
				},
				setCatalogOpen(parentSessionId, open) {
					sessions.setSubagentCatalogOpen(parentSessionId, open);
				}
			});
			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "subagent-sidebar-capsule",
				order: 50,
				locale: NS,
				store
			}, SubagentSidebarCapsule));
			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "subagent-sidebar-panel",
				order: 100,
				locale: NS,
				store,
				inject: panelInjected
			}, SubagentSidebarPanel));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map