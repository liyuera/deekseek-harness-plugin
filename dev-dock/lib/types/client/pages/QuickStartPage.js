import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * devDock quick-start page: edit named plans (projects with multi-selected
 * editors and one script each) and launch them through the agent.
 */
import { useMemo, useState } from 'react';
import css from './QuickStartPage.module.css';
/** Editors offered for multi-selection. */
const EDITOR_CHOICES = ['WebStorm', 'VS Code', 'IntelliJ IDEA', 'Cursor', 'Sublime Text', 'HBuilderX'];
/**
 * Render the quick-start page.
 * @param props - view store, data hook, actions, translator.
 * @returns the quick-start editor.
 */
export function QuickStartPage({ useDevDockData, actions, promptAgent, t }) {
    const settings = useDevDockData(data => data.settings);
    const projects = settings?.projects ?? [];
    // Viewing state: the plan being edited plus a draft of its items. The draft
    // stays local — it only lands in settings when the user saves.
    const [planName, setPlanName] = useState(settings?.quickStarts[0]?.name ?? '');
    const [draft, setDraft] = useState(settings?.quickStarts[0]?.items ?? []);
    const [showPicker, setShowPicker] = useState(false);
    const [query, setQuery] = useState('');
    const plans = settings?.quickStarts ?? [];
    const activePlan = plans.find((p) => p.name === planName);
    const availableProjects = useMemo(() => {
        const added = new Set(draft.map((item) => item.projectId));
        return projects.filter((p) => !added.has(p.id));
    }, [projects, draft]);
    const toggleIde = (projectId, ide) => {
        setDraft((prev) => prev.map((item) => {
            if (item.projectId !== projectId)
                return item;
            const has = item.ides.includes(ide);
            return { ...item, ides: has ? item.ides.filter((i) => i !== ide) : [...item.ides, ide] };
        }));
    };
    const selectScript = (projectId, script) => {
        setDraft((prev) => prev.map((item) => {
            if (item.projectId !== projectId)
                return item;
            const next = { ...item };
            if (item.script === script) {
                delete next.script;
            }
            else {
                next.script = script;
            }
            return next;
        }));
    };
    const removeItem = (projectId) => {
        setDraft((prev) => prev.filter((item) => item.projectId !== projectId));
    };
    const addItems = (ids) => {
        const items = ids.map((projectId) => ({ projectId, ides: [] }));
        setDraft((prev) => [...prev, ...items]);
        setShowPicker(false);
        setQuery('');
    };
    const savePlan = () => {
        if (planName.trim().length === 0)
            return;
        const plan = { name: planName.trim(), items: draft };
        void actions.setQuickStartPlan(plan);
    };
    const launch = () => {
        const name = planName.trim();
        if (name.length === 0 || draft.length === 0)
            return;
        void promptAgent(`使用 dev-dock_quick-start 执行一键启动方案 "${name}"`);
    };
    const projectById = (id) => projects.find((p) => p.id === id);
    return (_jsxs("div", { className: css.page, children: [_jsxs("div", { className: css.header, children: [_jsx("span", { className: css.label, children: t('drawer.tab.quickStart') }), _jsxs("div", { className: css.controlRow, children: [_jsx("input", { className: css.input, value: planName, placeholder: "plan name", onChange: (e) => { setPlanName(e.target.value); } }), _jsxs("div", { className: css.headerActions, children: [_jsx("button", { type: "button", className: css.action, onClick: savePlan, disabled: planName.trim().length === 0, children: "\u4FDD\u5B58" }), _jsx("button", { type: "button", className: css.actionPrimary, onClick: launch, disabled: draft.length === 0, children: "\u542F\u52A8" })] })] })] }), draft.length === 0 ? (_jsx("p", { className: css.empty, children: "\u6682\u65E0\u9879\u76EE\uFF0C\u70B9\u51FB\u4E0B\u65B9\u6309\u94AE\u6DFB\u52A0" })) : (_jsx("ul", { className: css.list, children: draft.map((item) => {
                    const project = projectById(item.projectId);
                    if (project === undefined)
                        return null;
                    return (_jsxs("li", { className: css.card, children: [_jsxs("div", { className: css.cardHeader, children: [_jsx("span", { className: css.name, children: project.name }), _jsx("button", { type: "button", className: css.remove, onClick: () => { removeItem(item.projectId); }, children: "\u2715" })] }), _jsx("div", { className: css.editorRow, children: EDITOR_CHOICES.map((ide) => {
                                    const active = item.ides.includes(ide);
                                    return (_jsx("button", { type: "button", className: active ? css.chipActive : css.chip, onClick: () => { toggleIde(item.projectId, ide); }, children: ide }, ide));
                                }) }), _jsx("div", { className: css.scriptRow, children: Object.keys(project.scripts).map((script) => (_jsx("button", { type: "button", className: item.script === script ? css.chipActive : css.chip, onClick: () => { selectScript(item.projectId, script); }, children: script }, script))) })] }, item.projectId));
                }) })), _jsx("button", { type: "button", className: css.addButton, onClick: () => { setShowPicker(true); }, children: "+ \u6DFB\u52A0\u9879\u76EE" }), showPicker && (_jsx("div", { className: css.pickerOverlay, role: "presentation", onClick: () => { setShowPicker(false); }, children: _jsxs("div", { className: css.picker, role: "dialog", "aria-modal": "true", onClick: (e) => { e.stopPropagation(); }, children: [_jsx("input", { className: css.input, placeholder: "\u641C\u7D22\u9879\u76EE...", value: query, onChange: (e) => { setQuery(e.target.value); }, autoFocus: true }), _jsxs("ul", { className: css.pickerList, children: [availableProjects
                                    .filter((p) => query.trim().length === 0 || p.name.toLowerCase().includes(query.trim().toLowerCase()))
                                    .map((p) => (_jsx("li", { children: _jsx("button", { type: "button", className: css.pickerRow, onClick: () => { addItems([p.id]); }, children: p.name }) }, p.id))), availableProjects.length === 0 && _jsx("li", { className: css.pickerEmpty, children: "\u6CA1\u6709\u53EF\u6DFB\u52A0\u7684\u9879\u76EE" })] }), _jsx("button", { type: "button", className: css.action, onClick: () => { setShowPicker(false); }, children: "\u53D6\u6D88" })] }) })), plans.length > 0 && activePlan === undefined && planName !== '' && (_jsxs("p", { className: css.hint, children: ["\u65B9\u6848 \"", planName, "\" \u5C1A\u672A\u4FDD\u5B58\uFF0C\u4FDD\u5B58\u540E\u751F\u6548"] }))] }));
}
//# sourceMappingURL=QuickStartPage.js.map