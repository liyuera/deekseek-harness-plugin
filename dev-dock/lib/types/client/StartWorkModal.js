import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Start-work dialog: check the workspace projects to launch, confirming
 * starts each selected project's editor + system terminal. The selection is
 * remembered in settings and prefilled next time.
 */
import { useEffect, useState } from 'react';
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives';
import { StartTile } from "./StartTile.js";
import css from './StartWork.module.css';
/**
 * The start-work dialog.
 * @param props - overlay runtime, view store, data hook, actions, translator.
 * @returns the modal, or null when closed.
 */
export function StartWorkModal({ useStore, actions, useWorkspaces, useDevDockData, dataActions, t }) {
    const { open } = useStore(state => state);
    const workspaces = useWorkspaces(state => state.items);
    const settings = useDevDockData(data => data.settings);
    const [selection, setSelection] = useState(new Set());
    const [phase, setPhase] = useState('idle');
    const [error, setError] = useState('');
    // Prefill from the remembered selection whenever the dialog opens.
    useEffect(() => {
        if (!open)
            return;
        const remembered = settings?.startWork ?? [];
        const available = new Set(workspaces.map(w => w.workspaceId));
        setSelection(new Set(remembered.filter(id => available.has(id))));
        setPhase('idle');
        setError('');
    }, [open, settings, workspaces]);
    if (!open)
        return null;
    const toggle = (workspaceId) => {
        setSelection(current => {
            const next = new Set(current);
            if (next.has(workspaceId))
                next.delete(workspaceId);
            else
                next.add(workspaceId);
            return next;
        });
    };
    const confirm = async () => {
        const ids = workspaces.map(w => w.workspaceId).filter(id => selection.has(id));
        if (ids.length === 0)
            return;
        setPhase('running');
        const answer = await dataActions.startWork(ids);
        // Remember the selection regardless of the outcome.
        await dataActions.setStartWork(ids);
        if (answer.ok) {
            // Successful start closes the dialog (the workspaces are launched).
            actions.setOpen(false);
            return;
        }
        setError('fetchError' in answer
            ? answer.error ?? String(answer.fetchError)
            : answer.error ?? 'start failed');
        setPhase('error');
    };
    const close = () => { actions.setOpen(false); };
    return (_jsxs(Modal, { open: true, onClose: close, title: t('start.button'), closeLabel: t('start.cancel'), description: t('start.notice'), className: css.dialog, footer: (_jsxs(_Fragment, { children: [_jsx(Button, { size: "md", variant: "outline", className: css.actionBtn, onClick: close, disabled: phase === 'running', children: t('start.cancel') }), _jsx(Button, { size: "md", variant: "primary", className: css.actionBtn, onClick: () => { void confirm(); }, disabled: selection.size === 0 || phase === 'running', children: phase === 'running' ? t('start.running') : t('start.confirm') })] })), children: [workspaces.length === 0 ? (_jsx("p", { className: css.empty, children: t('start.empty') })) : (_jsx("ul", { className: css.list, "aria-label": t('start.button'), children: workspaces.map((workspace) => {
                    // Per-workspace tile: the project's configured editor icon and
                    // the terminal preference icon, in the fused start-work style.
                    const pref = settings?.workspacePrefs.find(p => p.workspaceId === workspace.workspaceId)?.editor ?? '';
                    const ideSrc = `/dev-dock/workspace-editor-icon?workspaceId=${encodeURIComponent(workspace.workspaceId)}&v=${encodeURIComponent(pref)}`;
                    const termSrc = `/dev-dock/terminal-icon?app=${encodeURIComponent(settings?.terminalApp ?? 'default')}`;
                    return (_jsx("li", { children: _jsxs("label", { className: css.row, children: [_jsx("input", { type: "checkbox", checked: selection.has(workspace.workspaceId), onChange: () => { toggle(workspace.workspaceId); }, disabled: phase === 'running' }), _jsx("span", { className: css.rowIcon, children: _jsx(StartTile, { ideSrc: ideSrc, termSrc: termSrc }) }), _jsx("span", { className: css.name, children: workspace.title || workspace.path })] }) }, workspace.workspaceId));
                }) })), phase === 'error' && _jsx("p", { className: css.error, role: "alert", children: error })] }));
}
//# sourceMappingURL=StartWorkModal.js.map