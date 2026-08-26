import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * devDock settings page (`settings.section`): per-workspace editor
 * preference, editor manual paths + detection refresh, and the terminal
 * preference. Data rides the settings namespace mirror; desktop detection
 * goes through the host route.
 */
import { useState } from 'react';
import { Button, IconChevronDownOutline14, Input, Menu } from '@deepseek-ai/dsh-client-ui-primitives';
import { EDITOR_NAMES } from "./data.js";
import { DevIdeIcon, DevTerminalIcon } from "./icons.js";
import css from './DevDockSettingsPage.module.css';
/** Stable union of editor names for the preference selects. */
const EDITOR_OPTIONS = EDITOR_NAMES;
/**
 * dsh-style editor pill: rounded-chrome trigger plus the primitives Menu
 * trailing-check popup (same pattern as the permission preset selector).
 * @param props - current editor, available options, change callback.
 * @returns the pill and its menu.
 */
function WorkspaceEditorSelect({ value, options, onChange, }) {
    const [open, setOpen] = useState(false);
    const items = [{ id: '', label: '自动' }, ...options.map(name => ({ id: name, label: name }))];
    const display = value === '' ? '自动' : value;
    return (_jsx(Menu, { open: open, items: items, selectedId: value === '' ? '' : value, onSelect: (id) => { setOpen(false); onChange(id); }, onClose: () => { setOpen(false); }, align: "end", side: "bottom", anchor: (_jsxs("button", { type: "button", className: css.selector, onClick: () => { setOpen(!open); }, children: [_jsx("span", { children: display }), _jsx("span", { className: `${css.chevron} ${open ? css.chevronOpen : ''}`, "aria-hidden": true, children: _jsx(IconChevronDownOutline14, {}) })] })) }));
}
/**
 * Render the devDock settings page.
 * @param props - settings runtime, data hook, actions, translator.
 * @returns the settings sections.
 */
export function DevDockSettingsPage({ useWorkspaces, useDevDockData, dataActions, t }) {
    const workspaces = useWorkspaces(state => state.items);
    const settings = useDevDockData(data => data.settings);
    const [drafts, setDrafts] = useState({});
    const [detecting, setDetecting] = useState(false);
    const [detectError, setDetectError] = useState('');
    // Icons that failed to load (no detected path, non-macOS) fall back to the
    // generic </> glyph.
    const [iconFailed, setIconFailed] = useState({});
    const prefs = settings?.workspacePrefs ?? [];
    const editors = settings?.editors ?? [];
    const editorNames = [...new Set([...EDITOR_OPTIONS, ...editors.map(e => e.name)])];
    const prefOf = (workspaceId) => prefs.find(p => p.workspaceId === workspaceId)?.editor ?? '';
    const setPref = async (workspaceId, editor) => {
        // Empty editor resets the preference: the auto-detection default applies.
        await dataActions.setWorkspacePref(workspaceId, editor);
    };
    const saveManual = async (name, value) => {
        await dataActions.setEditorManualPath(name, value);
    };
    const refresh = async () => {
        setDetecting(true);
        setDetectError('');
        const answer = await dataActions.listEditors();
        setDetecting(false);
        if (!answer.ok)
            setDetectError(answer.error ?? 'detection failed');
    };
    return (_jsxs("div", { className: css.page, children: [_jsx("h2", { className: css.heading, children: t('settings.workspacePref.title') }), _jsx("p", { className: css.hint, children: t('settings.workspacePref.hint') }), workspaces.length === 0 && _jsx("p", { className: css.hint, children: t('start.noWorkspace') }), _jsx("ul", { className: css.rows, children: workspaces.map((workspace) => (_jsxs("li", { className: css.row, children: [_jsx("span", { className: css.name, children: workspace.title || workspace.path }), _jsx(WorkspaceEditorSelect, { value: prefOf(workspace.workspaceId), options: editorNames, onChange: (editor) => { void setPref(workspace.workspaceId, editor); } })] }, workspace.workspaceId))) }), _jsx("h2", { className: css.heading, children: t('settings.editors.title') }), _jsx("p", { className: css.hint, children: t('settings.editors.hint') }), _jsxs("div", { className: css.refreshRow, children: [_jsx(Button, { size: "sm", variant: "outline", onClick: () => { void refresh(); }, disabled: detecting, children: detecting ? `${t('settings.editors.refresh')}…` : t('settings.editors.refresh') }), detectError !== '' && _jsx("span", { className: css.error, role: "alert", children: detectError })] }), _jsx("ul", { className: css.rows, children: editorNames.map((name) => {
                    const editor = editors.find(e => e.name === name);
                    // manualPath is a string when set, undefined otherwise — keep the
                    // nullish chain honest so the detected path becomes the prefill.
                    const manual = editor?.manualPath;
                    const detected = editor?.detectedPath ?? '';
                    const draft = drafts[name] ?? manual ?? detected;
                    return (_jsxs("li", { className: css.editorRow, children: [_jsxs("span", { className: `${css.name} ${css.editorName}`, children: [iconFailed[name] ? (_jsx(DevIdeIcon, { size: 16 })) : (_jsx("img", { className: css.editorIcon, src: `/dev-dock/editor-icon?editor=${encodeURIComponent(name)}`, alt: "", onError: () => { setIconFailed(current => ({ ...current, [name]: true })); } })), _jsx("span", { className: css.editorLabel, children: name })] }), _jsx(Input, { className: css.editorInput, value: draft, placeholder: t('settings.editors.manual'), onChange: (event) => { setDrafts(current => ({ ...current, [name]: event.target.value })); } }), _jsx(Button, { size: "sm", variant: "outline", className: css.editorSave, onClick: () => { void saveManual(name, draft); }, children: t('settings.editors.save') })] }, name));
                }) }), _jsx("h2", { className: css.heading, children: t('settings.terminal.title') }), TERMINAL_APPS.map(({ key, labelKey }) => {
                const failed = iconFailed[key];
                return (_jsxs("label", { className: css.radioRow, children: [_jsx("input", { type: "radio", name: "dev-dock-terminal", checked: (settings?.terminalApp ?? 'default') === key, onChange: () => { void dataActions.setTerminalApp(key); } }), failed ? _jsx(DevTerminalIcon, { size: 16 }) : (_jsx("img", { className: css.editorIcon, src: `/dev-dock/terminal-icon?app=${key}`, alt: "", onError: () => { setIconFailed(current => ({ ...current, [key]: true })); } })), _jsx("span", { children: t(labelKey) })] }, key));
            })] }));
}
/** Terminal preference options with their icon route keys. */
const TERMINAL_APPS = [
    { key: 'default', labelKey: 'settings.terminal.default' },
    { key: 'iterm', labelKey: 'settings.terminal.iterm' },
];
//# sourceMappingURL=DevDockSettingsPage.js.map