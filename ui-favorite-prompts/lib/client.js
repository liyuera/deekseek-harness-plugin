window.__ModuleLoader__.load({
	id: "@liyuera/dsh-favorite-prompts",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		//#region \0dsh-css:/Users/liyu/Documents/www/DeepSeek/deepseek-harness/deepseek-harness-plugin/ui-favorite-prompts/src/client/settings/FavoritesSettingsPage.module.css.mjs
		const css$1 = ".Wp1I9q_page{flex-direction:column;gap:12px;display:flex}.Wp1I9q_toolbar{justify-content:flex-end;display:flex}.Wp1I9q_notice{font-size:var(--dsh-content-font-size-secondary,13px);line-height:calc(20px + var(--dsh-content-font-delta,0px));color:var(--dsw-alias-label-tertiary)}.Wp1I9q_empty{font-size:var(--dsh-content-font-size-secondary,13px);line-height:calc(22px + var(--dsh-content-font-delta,0px));color:var(--dsw-alias-label-tertiary);padding:24px 0}.Wp1I9q_list{flex-direction:column;gap:8px;margin:0;padding:0;list-style:none;display:flex}.Wp1I9q_row{border:.5px solid var(--dsw-alias-border-l3);border-radius:10px;align-items:flex-start;gap:12px;padding:10px 12px;display:flex}.Wp1I9q_rowBody{flex-direction:column;flex:1;gap:4px;min-width:0;display:flex}.Wp1I9q_text{white-space:pre-wrap;word-break:break-word;font-size:var(--dsh-content-font-size-secondary,13px);line-height:calc(20px + var(--dsh-content-font-delta,0px));color:var(--dsw-alias-label-primary)}.Wp1I9q_meta{font-size:var(--dsh-content-font-size-secondary,13px);color:var(--dsw-alias-label-tertiary)}.Wp1I9q_rowActions{align-items:center;gap:4px;display:flex}.Wp1I9q_editor{box-sizing:border-box;resize:vertical;border:.5px solid var(--dsw-alias-border-l3);width:100%;min-height:96px;color:var(--dsw-alias-label-primary);font-family:inherit;font-size:var(--dsh-content-font-size-secondary,13px);line-height:calc(20px + var(--dsh-content-font-delta,0px));background:0 0;border-radius:8px;padding:8px 10px}.Wp1I9q_editor:focus-visible{outline:2px solid var(--dsw-alias-border-l3);outline-offset:1px}.Wp1I9q_nameInput{box-sizing:border-box;border:.5px solid var(--dsw-alias-border-l3);width:100%;color:var(--dsw-alias-label-primary);font-family:inherit;font-size:var(--dsh-content-font-size-secondary,13px);line-height:calc(20px + var(--dsh-content-font-delta,0px));background:0 0;border-radius:8px;padding:6px 10px}.Wp1I9q_nameInput:focus-visible{outline:2px solid var(--dsw-alias-border-l3);outline-offset:1px}";
		const tagId$1 = "@liyuera/dsh-favorite-prompts/FavoritesSettingsPage.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@liyuera/dsh-favorite-prompts";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var FavoritesSettingsPage_module_css_default = {
			"editor": "Wp1I9q_editor",
			"empty": "Wp1I9q_empty",
			"list": "Wp1I9q_list",
			"meta": "Wp1I9q_meta",
			"nameInput": "Wp1I9q_nameInput",
			"notice": "Wp1I9q_notice",
			"page": "Wp1I9q_page",
			"row": "Wp1I9q_row",
			"rowActions": "Wp1I9q_rowActions",
			"rowBody": "Wp1I9q_rowBody",
			"text": "Wp1I9q_text",
			"toolbar": "Wp1I9q_toolbar"
		};
		//#endregion
		//#region lib/types/client/settings/FavoritesSettingsPage.js
		/** Settings page managing the saved-prompt list. */
		/** No row is open. */
		const IDLE = {
			editingId: null,
			draft: "",
			confirmingId: null,
			adding: false,
			draftName: ""
		};
		/**
		* Render the management page: edit, delete, and add saved prompts.
		* @param props - favorites hook and actions, plus the locale seat.
		* @returns the page body.
		*/
		function FavoritesSettingsPage({ useFavorites, actions, t }) {
			const status = useFavorites((state) => state.status);
			const error = useFavorites((state) => state.error);
			const items = useFavorites((state) => state.items);
			const [row, setRow] = (0, react.useState)(IDLE);
			const [renameError, setRenameError] = (0, react.useState)(null);
			const submitEdit = async () => {
				if (row.editingId === null || row.draft.trim() === "") return;
				const current = items.find((item) => item.id === row.editingId);
				const name = row.draftName.trim();
				setRenameError(null);
				if (name !== "" && name !== current?.name) {
					const renamed = await actions.rename(row.editingId, name);
					if (!renamed.ok) {
						setRenameError(renamed.error);
						return;
					}
				}
				await actions.update(row.editingId, row.draft);
				setRow(IDLE);
			};
			const submitAdd = async () => {
				if (row.draft.trim() === "") return;
				await actions.add(row.draft);
				setRow(IDLE);
			};
			const onDelete = async (id) => {
				if (row.confirmingId !== id) {
					setRow({
						...IDLE,
						confirmingId: id
					});
					return;
				}
				await actions.remove(id);
				setRow(IDLE);
			};
			if (status === "loading") return (0, react_jsx_runtime.jsx)("div", {
				className: FavoritesSettingsPage_module_css_default.notice,
				children: t("settings.loading")
			});
			if (status === "error") return (0, react_jsx_runtime.jsx)("div", {
				className: FavoritesSettingsPage_module_css_default.notice,
				children: t("settings.unavailable", { reason: error ?? "" })
			});
			const busy = row.editingId !== null || row.adding;
			return (0, react_jsx_runtime.jsxs)("div", {
				className: FavoritesSettingsPage_module_css_default.page,
				children: [
					renameError !== null && (0, react_jsx_runtime.jsx)("div", {
						className: FavoritesSettingsPage_module_css_default.notice,
						role: "alert",
						children: t("settings.renameFailed", { reason: renameError })
					}),
					(0, react_jsx_runtime.jsx)("div", {
						className: FavoritesSettingsPage_module_css_default.toolbar,
						children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							size: "sm",
							disabled: busy,
							onClick: () => {
								setRow({
									...IDLE,
									adding: true
								});
							},
							children: t("settings.new")
						})
					}),
					row.adding && (0, react_jsx_runtime.jsxs)("div", {
						className: FavoritesSettingsPage_module_css_default.rowBody,
						children: [(0, react_jsx_runtime.jsx)("textarea", {
							className: FavoritesSettingsPage_module_css_default.editor,
							"aria-label": t("settings.text"),
							value: row.draft,
							placeholder: t("settings.placeholder"),
							onChange: (event) => {
								setRow((current) => ({
									...current,
									draft: event.target.value
								}));
							}
						}), (0, react_jsx_runtime.jsxs)("div", {
							className: FavoritesSettingsPage_module_css_default.rowActions,
							children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "primary",
								size: "sm",
								onClick: () => {
									submitAdd();
								},
								children: t("settings.save")
							}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "ghost",
								size: "sm",
								onClick: () => {
									setRow(IDLE);
								},
								children: t("settings.cancel")
							})]
						})]
					}),
					items.length === 0 && !row.adding ? (0, react_jsx_runtime.jsx)("div", {
						className: FavoritesSettingsPage_module_css_default.empty,
						children: t("settings.empty")
					}) : (0, react_jsx_runtime.jsx)("ul", {
						className: FavoritesSettingsPage_module_css_default.list,
						children: items.map((item) => (0, react_jsx_runtime.jsxs)("li", {
							className: FavoritesSettingsPage_module_css_default.row,
							children: [(0, react_jsx_runtime.jsx)("div", {
								className: FavoritesSettingsPage_module_css_default.rowBody,
								children: row.editingId === item.id ? (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)("input", {
									className: FavoritesSettingsPage_module_css_default.nameInput,
									"aria-label": t("settings.name"),
									placeholder: t("settings.namePlaceholder"),
									value: row.draftName,
									onChange: (event) => {
										setRow((current) => ({
											...current,
											draftName: event.target.value
										}));
									}
								}), (0, react_jsx_runtime.jsx)("textarea", {
									className: FavoritesSettingsPage_module_css_default.editor,
									"aria-label": t("settings.text"),
									value: row.draft,
									onChange: (event) => {
										setRow((current) => ({
											...current,
											draft: event.target.value
										}));
									}
								})] }) : (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)("span", {
									className: FavoritesSettingsPage_module_css_default.text,
									children: item.text
								}), (0, react_jsx_runtime.jsxs)("span", {
									className: FavoritesSettingsPage_module_css_default.meta,
									children: [item.name === void 0 ? "" : `@${item.name} · `, t("settings.createdAt", { time: new Date(item.createdAt).toLocaleString() })]
								})] })
							}), (0, react_jsx_runtime.jsx)("div", {
								className: FavoritesSettingsPage_module_css_default.rowActions,
								children: row.editingId === item.id ? (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "primary",
									size: "sm",
									onClick: () => {
										submitEdit();
									},
									children: t("settings.save")
								}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									size: "sm",
									onClick: () => {
										setRow(IDLE);
									},
									children: t("settings.cancel")
								})] }) : (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									size: "sm",
									disabled: busy,
									onClick: () => {
										setRenameError(null);
										setRow({
											...IDLE,
											editingId: item.id,
											draft: item.text,
											draftName: item.name ?? ""
										});
									},
									children: t("settings.edit")
								}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: row.confirmingId === item.id ? "primary" : "ghost",
									size: "sm",
									disabled: busy,
									onClick: () => {
										onDelete(item.id);
									},
									children: row.confirmingId === item.id ? t("settings.confirmDelete") : t("settings.delete")
								})] })
							})]
						}, item.id))
					})
				]
			});
		}
		/** Sentence punctuation a bare mention may carry without being part of the name. */
		const TRAILING_PUNCTUATION_RE = /[.,;:!?，。；：！？]+$/u;
		/** The boundary rule the bubble decorator uses: `@token` at start or after whitespace. */
		const MENTION_RE = /(^|\s)@([^\s]+)/gu;
		/**
		* Collect the mention names one message text cites.
		* @param text - plain text of one user message.
		* @returns distinct names in order of first appearance.
		*/
		function scanMentions(text) {
			const names = [];
			MENTION_RE.lastIndex = 0;
			let match;
			while ((match = MENTION_RE.exec(text)) !== null) {
				const raw = match[2];
				if (raw.startsWith("\"")) continue;
				const name = raw.replace(TRAILING_PUNCTUATION_RE, "");
				if (name === "" || name.includes("/") || names.includes(name)) continue;
				names.push(name);
			}
			return names;
		}
		/**
		* Resolve mention names through a caller-supplied lookup.
		* @param names - names from {@link scanMentions}.
		* @param lookup - finds the cited prompt for a name, or `undefined` when none.
		* @returns hits, misses, and how many mentions the cap dropped.
		*/
		function resolveMentions(names, lookup) {
			const capped = names.slice(0, 3);
			const resolved = [];
			const unresolved = [];
			for (const name of capped) {
				const found = lookup(name);
				if (found === void 0) unresolved.push(name);
				else resolved.push(found);
			}
			return {
				names: [...capped],
				resolved,
				unresolved,
				omitted: names.length - capped.length
			};
		}
		/**
		* Fold the differences that do not change which prompt a text is: encoding
		* form, line endings, and every run of horizontal whitespace (each line's runs
		* become one space, and each line's ends are trimmed). Line structure is kept —
		* blank lines stay blank.
		* @param text - raw prompt or message text.
		* @returns the comparison form.
		*/
		function normalizeText(text) {
			return text.normalize("NFC").replace(/\r\n?/gu, "\n").split("\n").map((line) => line.replace(/[ \t]+/gu, " ").trim()).join("\n").trim();
		}
		/**
		* Derive the short menu identity of one saved prompt.
		* @param text - saved prompt text.
		* @param taken - identities already used in the same menu.
		* @returns a unique identity within `taken`.
		*/
		function candidateName(text, taken) {
			const trimmed = (text.split("\n").find((line) => line.trim() !== "") ?? text).trim();
			const base = [...trimmed].slice(0, 40).join("") || trimmed;
			if (!taken.has(base)) return base;
			for (let n = 2;; n += 1) {
				const candidate = `${base} (${n})`;
				if (!taken.has(candidate)) return candidate;
			}
		}
		/**
		* One-line preview for a menu row or a settings row.
		* @param text - saved prompt text.
		* @param limit - longest preview in code points.
		* @returns the flattened preview.
		*/
		function previewText(text, limit = 80) {
			const flat = normalizeText(text).replace(/\n+/gu, " ");
			const points = [...flat];
			return points.length <= limit ? flat : `${points.slice(0, limit).join("")}…`;
		}
		//#endregion
		//#region lib/types/client/strip/icons.js
		/** Hollow bookmark: this message is not saved. */
		const IconBookmarkOutline16 = ({ size = 16, className }) => (0, react_jsx_runtime.jsx)("svg", {
			width: size,
			height: size,
			className,
			viewBox: "0 0 16 16",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			children: (0, react_jsx_runtime.jsx)("path", {
				d: "M4 1.75h8c.69 0 1.25.56 1.25 1.25v11.2c0 .52-.6.8-1 .48L8 11.4l-4.25 3.28c-.4.31-1 .04-1-.48V3c0-.69.56-1.25 1.25-1.25Z",
				stroke: "currentColor",
				strokeWidth: "1.3",
				strokeLinejoin: "round"
			})
		});
		/** Solid bookmark: this message is saved. */
		const IconBookmarkFill16 = ({ size = 16, className }) => (0, react_jsx_runtime.jsx)("svg", {
			width: size,
			height: size,
			className,
			viewBox: "0 0 16 16",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			children: (0, react_jsx_runtime.jsx)("path", {
				d: "M4 1.75h8c.69 0 1.25.56 1.25 1.25v11.2c0 .52-.6.8-1 .48L8 11.4l-4.25 3.28c-.4.31-1 .04-1-.48V3c0-.69.56-1.25 1.25-1.25Z",
				fill: "currentColor"
			})
		});
		//#endregion
		//#region \0dsh-css:/Users/liyu/Documents/www/DeepSeek/deepseek-harness/deepseek-harness-plugin/ui-favorite-prompts/src/client/strip/FavoriteStrip.module.css.mjs
		const css = "._7vf8da_strip{height:calc(28px + var(--dsh-content-font-delta,0px));justify-content:flex-end;align-items:center;gap:8px;margin-top:-4px;display:flex}._7vf8da_action{width:calc(28px + var(--dsh-content-font-delta,0px));height:calc(28px + var(--dsh-content-font-delta,0px));color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:28px;justify-content:center;align-items:center;padding:6px;display:inline-flex}._7vf8da_action svg{width:calc(15px + var(--dsh-content-font-delta,0px));height:calc(15px + var(--dsh-content-font-delta,0px))}._7vf8da_action:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}._7vf8da_action[data-saved]{color:var(--dsw-alias-label-secondary)}._7vf8da_undo{font-size:var(--dsh-content-font-size-secondary,13px);line-height:calc(20px + var(--dsh-content-font-delta,0px));color:var(--dsw-alias-label-tertiary);align-items:center;gap:6px;display:inline-flex}._7vf8da_undoButton{font:inherit;color:var(--dsw-alias-link);cursor:pointer;background:0 0;border:none;padding:0}._7vf8da_undoButton:hover{text-underline-offset:3px;text-decoration:underline dotted}@media (hover:hover){._7vf8da_strip{opacity:.35;transition:opacity 80ms}._7vf8da_strip:hover,._7vf8da_strip:focus-within,[data-chat-flow-kind=user]:hover+[data-chat-flow-kind=favorite-strip] ._7vf8da_strip{opacity:1}}@media (prefers-reduced-motion:reduce){._7vf8da_strip{transition:none}}._7vf8da_block{flex-direction:column;align-items:flex-end;display:flex}._7vf8da_citations{flex-direction:column;align-items:flex-end;gap:4px;max-width:100%;display:flex}._7vf8da_citationsToggle{max-width:100%;font-family:inherit;font-size:var(--dsh-content-font-size-secondary,13px);line-height:calc(20px + var(--dsh-content-font-delta,0px));color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:6px;flex-wrap:wrap;align-items:baseline;gap:2px;padding:2px 6px;display:inline-flex}._7vf8da_citationsToggle:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}._7vf8da_citationsToggle:focus-visible{outline:2px solid var(--dsw-alias-link);outline-offset:1px}._7vf8da_citationName{color:var(--dsw-alias-label-secondary)}._7vf8da_citationNote{color:var(--dsw-alias-label-tertiary)}._7vf8da_citationsBody{border:.5px solid var(--dsw-alias-border-l3);border-radius:10px;flex-direction:column;gap:8px;max-width:520px;max-height:240px;padding:8px 10px;display:flex;overflow:auto}._7vf8da_citation{flex-direction:column;gap:2px;display:flex}._7vf8da_citationText{font-size:var(--dsh-content-font-size-secondary,13px);line-height:calc(20px + var(--dsh-content-font-delta,0px));color:var(--dsw-alias-label-primary);white-space:pre-wrap;overflow-wrap:anywhere}";
		const tagId = "@liyuera/dsh-favorite-prompts/FavoriteStrip.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@liyuera/dsh-favorite-prompts";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var FavoriteStrip_module_css_default = {
			"action": "_7vf8da_action",
			"block": "_7vf8da_block",
			"citation": "_7vf8da_citation",
			"citationName": "_7vf8da_citationName",
			"citationNote": "_7vf8da_citationNote",
			"citationText": "_7vf8da_citationText",
			"citations": "_7vf8da_citations",
			"citationsBody": "_7vf8da_citationsBody",
			"citationsToggle": "_7vf8da_citationsToggle",
			"strip": "_7vf8da_strip",
			"undo": "_7vf8da_undo",
			"undoButton": "_7vf8da_undoButton"
		};
		//#endregion
		//#region lib/types/client/strip/FavoriteStrip.js
		/**
		* One bookmark strip under a user message: the citation line for saved prompts
		* this message cites, plus the bookmark action with an inline undo window.
		*/
		/** How long the inline undo stays available, in ms. */
		const UNDO_WINDOW_MS = 5e3;
		/**
		* Render the bookmark strip for one message.
		* @param props - node payload, session id, favorites hook and actions, copy.
		* @returns the strip row.
		*/
		function FavoriteStrip({ node, sessionId, useFavorites, actions, t }) {
			const key = normalizeText(node.data.text);
			const saved = useFavorites((state) => state.byText.get(key));
			const items = useFavorites((state) => state.items);
			const ready = useFavorites((state) => state.status === "ready");
			const [removed, setRemoved] = (0, react.useState)(null);
			const [message, setMessage] = (0, react.useState)(null);
			const [open, setOpen] = (0, react.useState)(false);
			const timer = (0, react.useRef)(null);
			const cited = (0, react.useMemo)(() => {
				if (!ready) return null;
				const names = scanMentions(node.data.text);
				if (names.length === 0) return null;
				const byName = /* @__PURE__ */ new Map();
				for (const item of items) if (item.name !== void 0) byName.set(item.name, {
					name: item.name,
					text: item.text
				});
				return resolveMentions(names, (name) => byName.get(name));
			}, [
				ready,
				items,
				node.data.text
			]);
			(0, react.useEffect)(() => () => {
				if (timer.current !== null) clearTimeout(timer.current);
			}, []);
			const announce = (text) => {
				setMessage(text);
				if (timer.current !== null) clearTimeout(timer.current);
				timer.current = setTimeout(() => {
					setMessage(null);
					setRemoved(null);
				}, UNDO_WINDOW_MS);
			};
			const onToggle = async () => {
				if (saved === void 0) {
					announce(await actions.add(node.data.text, {
						sessionId,
						seq: node.data.seq
					}) ? t("strip.added") : t("strip.failed"));
					return;
				}
				const record = await actions.remove(saved.id);
				if (record === null) return;
				setRemoved(record);
				announce(t("strip.undone"));
			};
			const onUndo = async () => {
				if (removed === null) return;
				await actions.restore(removed);
				setRemoved(null);
				setMessage(null);
			};
			const citedNames = cited === null ? [] : [...cited.resolved.map((item) => item.name), ...cited.unresolved];
			const unresolved = new Set(cited?.unresolved ?? []);
			return (0, react_jsx_runtime.jsxs)("div", {
				className: FavoriteStrip_module_css_default.block,
				children: [(0, react_jsx_runtime.jsxs)("div", {
					className: FavoriteStrip_module_css_default.strip,
					children: [message !== null && (0, react_jsx_runtime.jsxs)("span", {
						className: FavoriteStrip_module_css_default.undo,
						role: "status",
						children: [message, removed !== null && (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: FavoriteStrip_module_css_default.undoButton,
							onClick: () => {
								onUndo();
							},
							children: t("strip.undo")
						})]
					}), (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: FavoriteStrip_module_css_default.action,
						"data-saved": saved === void 0 ? void 0 : true,
						"aria-label": saved === void 0 ? t("strip.favorite") : t("strip.unfavorite"),
						"aria-pressed": saved !== void 0,
						onClick: () => {
							onToggle();
						},
						children: saved === void 0 ? (0, react_jsx_runtime.jsx)(IconBookmarkOutline16, {}) : (0, react_jsx_runtime.jsx)(IconBookmarkFill16, {})
					})]
				}), cited !== null && citedNames.length > 0 && (0, react_jsx_runtime.jsxs)("div", {
					className: FavoriteStrip_module_css_default.citations,
					children: [(0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: FavoriteStrip_module_css_default.citationsToggle,
						"aria-expanded": open,
						"aria-label": open ? t("strip.collapse") : t("strip.expand"),
						onClick: () => {
							setOpen((value) => !value);
						},
						children: [
							t("strip.cites"),
							citedNames.map((name, index) => (0, react_jsx_runtime.jsxs)("span", {
								className: FavoriteStrip_module_css_default.citationName,
								children: [
									index === 0 ? " " : t("strip.citesSeparator"),
									`@${name}`,
									unresolved.has(name) && (0, react_jsx_runtime.jsx)("span", {
										className: FavoriteStrip_module_css_default.citationNote,
										children: t("strip.notFound")
									})
								]
							}, name)),
							cited.omitted > 0 && (0, react_jsx_runtime.jsx)("span", {
								className: FavoriteStrip_module_css_default.citationNote,
								children: ` (${t("strip.omitted", { count: String(cited.omitted) })})`
							})
						]
					}), open && (0, react_jsx_runtime.jsxs)("div", {
						className: FavoriteStrip_module_css_default.citationsBody,
						children: [cited.resolved.map((item) => (0, react_jsx_runtime.jsxs)("div", {
							className: FavoriteStrip_module_css_default.citation,
							children: [(0, react_jsx_runtime.jsx)("span", {
								className: FavoriteStrip_module_css_default.citationName,
								children: `@${item.name}`
							}), (0, react_jsx_runtime.jsx)("div", {
								className: FavoriteStrip_module_css_default.citationText,
								children: item.text
							})]
						}, item.name)), cited.unresolved.map((name) => (0, react_jsx_runtime.jsxs)("div", {
							className: FavoriteStrip_module_css_default.citation,
							children: [(0, react_jsx_runtime.jsx)("span", {
								className: FavoriteStrip_module_css_default.citationName,
								children: `@${name}`
							}), (0, react_jsx_runtime.jsx)("div", {
								className: FavoriteStrip_module_css_default.citationNote,
								children: t("strip.notFound")
							})]
						}, name))]
					})]
				})]
			});
		}
		//#endregion
		//#region node_modules/@deepseek-ai/dsh-session/lib/types/surface.js
		/** Runtime counterpart of the message-producing event union. */
		const SURFACE_EVENT_TYPES = new Set([
			"system/message",
			"developer/message",
			"user/message",
			"assistant/message",
			"tool/result"
		]);
		/**
		* Narrow an event to a surface-eligible event carrying its required marker.
		* @param event - event to test.
		* @returns true when both the type and marker identify a surface event.
		*/
		function isSurfaceEvent(event) {
			if (!SURFACE_EVENT_TYPES.has(event.type)) return false;
			return event.surfaceOp !== void 0;
		}
		/**
		* Narrow an event to an append-origin surface event: one that entered the
		* surface at its own log position and was never itself a replacement copy.
		*
		* The model-visible surface deliberately shadows replaced ranges, so it is the
		* wrong source for a human transcript — a landed replacement would erase
		* conversation the user already saw. Append-origin events are that transcript's
		* durable source material; replacement copies stay model-only.
		* @param event - event to test.
		* @returns true when the event appended to the surface tail.
		*/
		function isAppendSurfaceEvent(event) {
			return isSurfaceEvent(event) && event.surfaceOp === "append";
		}
		//#endregion
		//#region lib/types/client/strip/definition.js
		/** Renderer dispatch key; see the ordering contract above before changing it. */
		const FAVORITE_STRIP_KIND = "favorite-strip";
		/**
		* Join the text blocks of one message the way the built-in copy action does,
		* so the saved text is exactly what the user sees.
		* @param content - message content blocks.
		* @returns the joined plain text.
		*/
		function messageText(content) {
			if (!Array.isArray(content)) return "";
			const texts = [];
			for (const block of content) {
				const candidate = block;
				if (candidate.type === "text" && typeof candidate.text === "string") texts.push(candidate.text);
			}
			return texts.join("");
		}
		/** One bookmark strip per user-authored message with visible text. */
		const favoriteStripDefinition = {
			kind: FAVORITE_STRIP_KIND,
			target: "chat",
			match: (event) => {
				if (event.type !== "user/message" || !isAppendSurfaceEvent(event)) return null;
				if (event.data.source.kind !== "user") return null;
				return messageText(event.data.content).trim() === "" ? null : {
					id: String(event.data.id),
					role: "start"
				};
			},
			start: (_context, match) => {
				if (match.event.type !== "user/message") throw new Error("favorite-strip start requires user/message");
				return {
					text: messageText(match.event.data.content),
					seq: match.event.seq
				};
			},
			update: (context) => context.state,
			buildViewNode: (context) => {
				if (context.state === void 0 || context.start === void 0) return null;
				const location = context.start.location;
				return {
					key: context.key,
					kind: FAVORITE_STRIP_KIND,
					id: context.id,
					target: "chat",
					anchorSeq: context.start.event.seq,
					location,
					visibility: "visible",
					data: context.state
				};
			}
		};
		//#endregion
		//#region lib/types/client/trigger/source.js
		/** Source name; a picked chip routes back through it at submit time. */
		const FAVORITES_SOURCE_NAME = "favorites";
		/**
		* Menu position among `@` sources. The menu lays groups out by ascending
		* `order`, and the file/session source (`ui-reference`) declares none (0), so
		* a negative value is what lifts saved prompts to the top of the `@` menu.
		*/
		const FAVORITES_SOURCE_ORDER = -100;
		/** Longest row preview, in code points. */
		const PREVIEW_LIMIT = 60;
		/**
		* Build the saved-prompt trigger source.
		* @param state - current store snapshot, read per keystroke.
		* @param t - dictionary-bound translator.
		* @returns the source registered on `ctx.inputTriggers`.
		*/
		function createFavoritesSource(state, t) {
			return {
				trigger: "@",
				name: FAVORITES_SOURCE_NAME,
				order: FAVORITES_SOURCE_ORDER,
				showGroupTitle: false,
				candidates: (_session, req) => {
					const query = req.query.trim().toLowerCase();
					const items = [...state().items].sort((left, right) => right.createdAt - left.createdAt);
					const matched = query === "" ? items : items.filter((item) => item.text.toLowerCase().includes(query));
					const taken = /* @__PURE__ */ new Set();
					const rows = matched.slice(0, 50).map((item) => {
						const name = item.name ?? candidateName(item.text, taken);
						taken.add(name);
						return {
							name,
							label: name,
							description: previewText(item.text, PREVIEW_LIMIT),
							section: t("group"),
							icon: IconBookmarkOutline16,
							value: item.id
						};
					});
					return Promise.resolve(rows);
				},
				onPick: (pick) => {
					const id = pick.candidate.value;
					const record = id === void 0 ? void 0 : state().items.find((item) => item.id === id);
					if (record === void 0) return void 0;
					if (record.name === void 0) return { text: record.text };
					return { insert: {
						source: FAVORITES_SOURCE_NAME,
						ref: record.name,
						label: pick.candidate.label ?? pick.candidate.name,
						clipboardText: `@${record.name}`
					} };
				},
				codec: {
					clipboardText: (ref) => `@${ref}`,
					serialize: (ref) => Promise.resolve(`@${ref}`)
				}
			};
		}
		//#endregion
		//#region lib/types/schema.js
		/** Same-origin HTTP route serving the browser half. */
		const PROMPT_ROUTE = "/favorite-prompts";
		//#endregion
		//#region lib/types/client/transport.js
		/** HTTP transport of the favorite-prompts route (browser half). */
		/**
		* Call the route and unwrap one JSON answer.
		* @param path - route path, query included.
		* @param init - fetch options.
		* @returns the successful answer.
		*/
		async function call(path, init) {
			const response = await fetch(path, {
				headers: { "content-type": "application/json" },
				...init
			});
			const answer = await response.json();
			if (!response.ok || answer.ok !== true) throw new Error(answer.error ?? `HTTP ${response.status}`);
			return answer;
		}
		/** The live transport. */
		const promptTransport = {
			list: async () => (await call("/favorite-prompts", { method: "GET" })).items ?? [],
			create: async (text, source) => {
				return (await call(PROMPT_ROUTE, {
					method: "POST",
					body: JSON.stringify(source === void 0 ? { text } : {
						text,
						source
					})
				})).item;
			},
			update: async (id, text) => {
				return (await call(PROMPT_ROUTE, {
					method: "PATCH",
					body: JSON.stringify({
						id,
						text
					})
				})).item;
			},
			rename: async (id, name) => {
				return (await call(PROMPT_ROUTE, {
					method: "PATCH",
					body: JSON.stringify({
						id,
						name
					})
				})).item;
			},
			restore: async (record) => {
				return (await call(PROMPT_ROUTE, {
					method: "PUT",
					body: JSON.stringify(record)
				})).item;
			},
			remove: async (id) => {
				await call(`${PROMPT_ROUTE}?id=${encodeURIComponent(id)}`, { method: "DELETE" });
			}
		};
		//#endregion
		//#region lib/types/client/store.js
		/**
		* Browser-side mirror of the saved-prompt list. The host owns the records; this
		* store owns the derived lookup index both the strip and the trigger read, and
		* rebuilds it in the same step the list changes.
		*/
		/**
		* Index the current list by normalized text. The oldest record wins, so a
		* duplicate keeps one stable identity across rebuilds.
		* @param items - current records.
		* @returns the lookup map.
		*/
		function indexByText(items) {
			const index = /* @__PURE__ */ new Map();
			for (const record of [...items].sort((left, right) => left.createdAt - right.createdAt)) {
				const key = normalizeText(record.text);
				if (!index.has(key)) index.set(key, record);
			}
			return index;
		}
		/**
		* Create the store and its actions.
		* @param transport - route transport; tests pass an in-memory double.
		* @returns the shared store handle.
		*/
		function createFavoritesStore(transport = promptTransport) {
			const state = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)({
				status: "loading",
				items: [],
				byText: /* @__PURE__ */ new Map()
			});
			const publish = (items) => {
				const sorted = [...items].sort((left, right) => right.createdAt - left.createdAt);
				state.set({
					status: "ready",
					items: sorted,
					byText: indexByText(sorted)
				});
			};
			const refresh = async () => {
				try {
					publish(await transport.list());
					return true;
				} catch (error) {
					state.set({
						status: "error",
						items: [],
						byText: /* @__PURE__ */ new Map(),
						error: error instanceof Error ? error.message : String(error)
					});
					return false;
				}
			};
			const mutate = async (operation) => {
				try {
					await operation();
				} catch {
					return false;
				}
				if (state.getSnapshot().status === "ready") await refresh();
				return true;
			};
			return {
				state,
				actions: {
					refresh,
					add: (text, source) => mutate(() => transport.create(text, source)),
					update: (id, text) => mutate(() => transport.update(id, text)),
					rename: async (id, name) => {
						try {
							await transport.rename(id, name);
						} catch (error) {
							return {
								ok: false,
								error: error instanceof Error ? error.message : String(error)
							};
						}
						if (state.getSnapshot().status === "ready") await refresh();
						return { ok: true };
					},
					remove: async (id) => {
						const record = state.getSnapshot().items.find((item) => item.id === id) ?? null;
						if (record === null) return null;
						return await mutate(() => transport.remove(id)) ? record : null;
					},
					restore: (record) => mutate(() => transport.restore(record))
				}
			};
		}
		//#endregion
		//#region lib/types/client/locales.js
		/** Copy dictionaries for the favorite-prompts plugin. */
		/** Simplified Chinese dictionary and key source of truth. */
		const zh = {
			"nav": "收藏提示词",
			"group": "收藏",
			"strip.cites": "引用了",
			"strip.citesSeparator": "、",
			"strip.notFound": "（未找到）",
			"strip.omitted": "另有 {count} 条未展开",
			"strip.expand": "展开引用的提示词",
			"strip.collapse": "收起引用的提示词",
			"strip.favorite": "收藏这条提示词",
			"strip.unfavorite": "取消收藏",
			"strip.undo": "撤销",
			"strip.undone": "已取消收藏",
			"strip.added": "已收藏",
			"strip.failed": "操作失败，请重试",
			"settings.new": "新增收藏",
			"settings.empty": "还没有收藏。在任意一条自己发出的消息下方点书签图标即可收藏。",
			"settings.unavailable": "收藏服务不可用：{reason}",
			"settings.loading": "正在读取收藏…",
			"settings.save": "保存",
			"settings.cancel": "取消",
			"settings.edit": "编辑",
			"settings.delete": "删除",
			"settings.confirmDelete": "确认删除",
			"settings.name": "名字",
			"settings.text": "提示词正文",
			"settings.namePlaceholder": "用于 @ 引用的名字（字母、数字、中文或连字符）",
			"settings.renameFailed": "改名失败：{reason}",
			"settings.placeholder": "粘贴或输入一段提示词",
			"settings.createdAt": "收藏于 {time}"
		};
		/** English dictionary checked against the Chinese key set. */
		const en = {
			"nav": "Saved prompts",
			"group": "Saved",
			"strip.cites": "Cites",
			"strip.citesSeparator": ", ",
			"strip.notFound": " (not found)",
			"strip.omitted": "{count} more not expanded",
			"strip.expand": "Show cited prompts",
			"strip.collapse": "Hide cited prompts",
			"strip.favorite": "Save this prompt",
			"strip.unfavorite": "Remove from saved",
			"strip.undo": "Undo",
			"strip.undone": "Removed",
			"strip.added": "Saved",
			"strip.failed": "Failed, please retry",
			"settings.new": "New saved prompt",
			"settings.empty": "Nothing saved yet. Use the bookmark button under any message you sent.",
			"settings.unavailable": "Saved prompts are unavailable: {reason}",
			"settings.loading": "Reading saved prompts…",
			"settings.save": "Save",
			"settings.cancel": "Cancel",
			"settings.edit": "Edit",
			"settings.delete": "Delete",
			"settings.confirmDelete": "Confirm delete",
			"settings.name": "Name",
			"settings.text": "Prompt text",
			"settings.namePlaceholder": "Name used by @ mentions (letters, digits, CJK, hyphens)",
			"settings.renameFailed": "Rename failed: {reason}",
			"settings.placeholder": "Paste or type a prompt",
			"settings.createdAt": "Saved {time}"
		};
		/** Dictionary namespace owned by this plugin. */
		const NS = "favoritePrompts";
		//#endregion
		//#region lib/types/client/index.js
		/** Services the browser half reads; the fiber waits for all four. */
		const inject = [
			"slots",
			"locale",
			"uiConversation",
			"inputTriggers"
		];
		/**
		* Wire the store and the three contributions.
		* @param ctx - browser context carrying the slot registry and the two registries.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "favorite-prompts: dictionaries");
			const t = ctx.locale.bind(NS);
			const favorites = createFavoritesStore();
			favorites.actions.refresh();
			ctx.effect(() => {
				const onFocus = () => {
					favorites.actions.refresh();
				};
				window.addEventListener("focus", onFocus);
				return () => {
					window.removeEventListener("focus", onFocus);
				};
			}, "favorite-prompts: focus refresh");
			ctx.effect(() => ctx.uiConversation.events.register(favoriteStripDefinition), "favorite-prompts: strip definition");
			ctx.effect(() => ctx.slots.inject("conversation.chat.node", () => ctx.slots.register({
				name: "conversation.chat.node",
				key: FAVORITE_STRIP_KIND,
				locale: NS,
				inject: () => ({
					hooks: { favorites: favorites.state },
					actions: favorites.actions
				})
			}, FavoriteStrip)), "favorite-prompts: strip slot");
			const inputTriggers = ctx.get("inputTriggers");
			ctx.effect(() => inputTriggers.registerSource(createFavoritesSource(() => favorites.state.getSnapshot(), t)), "favorite-prompts: @ source");
			ctx.effect(() => ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "favorite-prompts",
				order: 30,
				label: () => t("nav"),
				locale: NS,
				inject: () => ({
					hooks: { favorites: favorites.state },
					actions: favorites.actions
				})
			}, FavoritesSettingsPage)), "favorite-prompts: settings section");
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map