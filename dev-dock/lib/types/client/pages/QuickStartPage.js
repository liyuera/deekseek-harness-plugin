import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * devDock quick-start page: edit named plans (projects with multi-selected
 * editors and one script each) and launch them through the agent.
 */
import { useMemo, useState } from 'react';
import { Button, Input, Modal } from '@deepseek-ai/dsh-client-ui-primitives';
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
    return (_jsxs("div", { className: css.page, children: [_jsxs("div", { className: css.header, children: [_jsx("span", { className: css.label, children: t('quickStart.planName') }), _jsxs("div", { className: css.controlRow, children: [_jsx(Input, { className: css.input, value: planName, placeholder: t('quickStart.planNamePlaceholder'), onChange: (e) => { setPlanName(e.target.value); } }), _jsxs("div", { className: css.headerActions, children: [_jsx(Button, { size: "sm", onClick: savePlan, disabled: planName.trim().length === 0, children: t('quickStart.save') }), _jsx(Button, { size: "sm", variant: "primary", onClick: launch, disabled: draft.length === 0, children: t('quickStart.launch') })] })] })] }), draft.length === 0 ? (_jsx("p", { className: css.empty, children: t('quickStart.empty') })) : (_jsx("ul", { className: css.list, children: draft.map((item) => {
                    const project = projectById(item.projectId);
                    if (project === undefined)
                        return null;
                    return (_jsxs("li", { className: css.card, children: [_jsxs("div", { className: css.cardHeader, children: [_jsx("span", { className: css.name, children: project.name }), _jsx("button", { type: "button", className: css.remove, "aria-label": `${t('quickStart.removeItem')} ${project.name}`, onClick: () => { removeItem(item.projectId); }, children: "\u2715" })] }), _jsx("div", { className: css.editorRow, children: EDITOR_CHOICES.map((ide) => {
                                    const active = item.ides.includes(ide);
                                    return (_jsx("button", { type: "button", className: active ? css.chipActive : css.chip, onClick: () => { toggleIde(item.projectId, ide); }, children: ide }, ide));
                                }) }), _jsx("div", { className: css.scriptRow, children: Object.keys(project.scripts).map((script) => (_jsx("button", { type: "button", className: item.script === script ? css.chipActive : css.chip, onClick: () => { selectScript(item.projectId, script); }, children: script }, script))) })] }, item.projectId));
                }) })), _jsx("button", { type: "button", className: css.addButton, onClick: () => { setShowPicker(true); }, children: t('quickStart.addItem') }), _jsx(Modal, { open: showPicker, onClose: () => { setShowPicker(false); }, title: t('quickStart.addProject'), closeLabel: t('quickStart.cancel'), footer: (_jsx(Button, { variant: "outline", onClick: () => { setShowPicker(false); }, children: t('quickStart.cancel') })), children: _jsxs("div", { className: css.picker, children: [_jsx(Input, { value: query, placeholder: t('quickStart.searchPlaceholder'), onChange: (e) => { setQuery(e.target.value); }, autoFocus: true }), _jsxs("ul", { className: css.pickerList, children: [availableProjects
                                    .filter((p) => query.trim().length === 0 || p.name.toLowerCase().includes(query.trim().toLowerCase()))
                                    .map((p) => (_jsx("li", { children: _jsx("button", { type: "button", className: css.pickerRow, onClick: () => { addItems([p.id]); }, children: p.name }) }, p.id))), availableProjects.length === 0 && _jsx("li", { className: css.pickerEmpty, children: t('quickStart.noAvailable') })] })] }) }), plans.length > 0 && activePlan === undefined && planName !== '' && (_jsx("p", { className: css.hint, children: t('quickStart.unsaved', { name: planName }) }))] }));
}
//# sourceMappingURL=QuickStartPage.js.map