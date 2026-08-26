import { jsx as _jsx } from "react/jsx-runtime";
/**
 * Composer actions: the three devDock buttons (IDE / terminal / start) in
 * the input tool row's left seat, bound to the current session's workspace.
 * Same resolution and feedback as the session-header actions, in a compact
 * group beside the resident chrome.
 */
import { useEffect, useRef, useState } from 'react';
import { IconCheckOutline16 } from '@deepseek-ai/dsh-client-ui-primitives';
import { DevIdeAppIcon, DevTerminalAppIcon } from "./icons.js";
import { StartTile } from "./StartTile.js";
import css from './SessionActions.module.css';
/** Locale key per action kind. */
const KIND_KEY = {
    ide: 'header.ide',
    terminal: 'header.terminal',
    start: 'header.start',
};
/**
 * The composer tool-row action group.
 * @param props - input-zone runtime, settings mirror, actions, translator.
 * @returns the three buttons, or null when the session has no workspace.
 */
export function ComposerActions({ sessionId, useWorkspaces, useDevDockData, dataActions, t }) {
    const workspace = useWorkspaces(state => state.items.find(w => w.sessionIds.includes(sessionId)));
    const settings = useDevDockData(data => data.settings);
    const [states, setStates] = useState({
        ide: 'idle', terminal: 'idle', start: 'idle',
    });
    const [errors, setErrors] = useState({});
    const [iconFailed, setIconFailed] = useState({});
    const timer = useRef(null);
    useEffect(() => () => {
        if (timer.current !== null)
            clearTimeout(timer.current);
    }, []);
    // All hooks stay above the conditional return; the URLs follow the current
    // preferences and re-try images when they change (same latch discipline as
    // the header actions).
    const editorPref = settings?.workspacePrefs.find(p => p.workspaceId === workspace?.workspaceId)?.editor ?? '';
    const terminalApp = settings?.terminalApp ?? 'default';
    const editorIconUrl = workspace === undefined
        ? ''
        : `/dev-dock/workspace-editor-icon?workspaceId=${encodeURIComponent(workspace.workspaceId)}&v=${encodeURIComponent(editorPref)}`;
    const terminalIconUrl = `/dev-dock/terminal-icon?app=${encodeURIComponent(terminalApp)}`;
    useEffect(() => {
        setIconFailed({});
    }, [editorIconUrl, terminalIconUrl]);
    if (workspace === undefined) {
        // No workspace for this session: keep the seat but render nothing.
        return null;
    }
    const run = async (kind) => {
        if (states[kind] === 'busy')
            return;
        setStates(current => ({ ...current, [kind]: 'busy' }));
        const answer = kind === 'ide'
            ? await dataActions.openIde(workspace.workspaceId)
            : kind === 'terminal'
                ? await dataActions.openTerminal(workspace.workspaceId)
                : await dataActions.start(workspace.workspaceId);
        setStates(current => ({ ...current, [kind]: answer.ok ? 'ok' : 'error' }));
        if (!answer.ok)
            setErrors(current => ({ ...current, [kind]: answer.error ?? 'unknown error' }));
        if (timer.current !== null)
            clearTimeout(timer.current);
        timer.current = setTimeout(() => {
            setStates({ ide: 'idle', terminal: 'idle', start: 'idle' });
        }, answer.ok ? 1500 : 4000);
    };
    const kindIcon = (kind) => {
        if (kind === 'ide') {
            return iconFailed.ide === true
                ? _jsx(DevIdeAppIcon, { size: 16 })
                : _jsx("img", { className: css.appIcon, src: editorIconUrl, alt: "", onError: () => { setIconFailed(c => ({ ...c, ide: true })); } });
        }
        if (kind === 'terminal') {
            return iconFailed.terminal === true
                ? _jsx(DevTerminalAppIcon, { size: 16 })
                : _jsx("img", { className: css.appIcon, src: terminalIconUrl, alt: "", onError: () => { setIconFailed(c => ({ ...c, terminal: true })); } });
        }
        return _jsx(StartTile, { ideSrc: editorIconUrl, termSrc: terminalIconUrl });
    };
    return (_jsx("span", { className: css.group, children: ['ide', 'terminal', 'start'].map((kind) => {
            const state = states[kind];
            const title = state === 'error'
                ? t('header.error', { error: errors[kind] ?? '' })
                : t(KIND_KEY[kind]);
            return (_jsx("button", { type: "button", className: `${css.button} ${state === 'error' ? css.error : ''}`, title: title, "aria-label": title, "aria-disabled": state === 'busy', onClick: () => { void run(kind); }, children: state === 'ok' ? _jsx(IconCheckOutline16, { size: 16 }) : kindIcon(kind) }, kind));
        }) }));
}
//# sourceMappingURL=ComposerActions.js.map