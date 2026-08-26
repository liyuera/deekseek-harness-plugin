import { jsx as _jsx } from "react/jsx-runtime";
/**
 * Session-header action button: one of IDE / terminal / start for the
 * current session's workspace. Deterministic — clicking calls the host route
 * directly; the button is disabled while the session has no workspace or
 * while an action is in flight.
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
 * One session-header action button.
 * @param props - header action runtime, inject face, translator.
 * @returns the icon button, or null when the session has no workspace.
 */
export function SessionActionButton({ sessionId, useWorkspaces, useDevDockData, action, dataActions, t }) {
    const workspace = useWorkspaces(state => state.items.find(w => w.sessionIds.includes(sessionId)));
    const settings = useDevDockData(data => data.settings);
    const [state, setState] = useState('idle');
    const [error, setError] = useState('');
    const [iconFailed, setIconFailed] = useState({});
    const okTimer = useRef(null);
    useEffect(() => () => {
        if (okTimer.current !== null)
            clearTimeout(okTimer.current);
    }, []);
    // All hooks stay above the conditional return: the workspace may disappear
    // between renders, so hook count must not depend on it. The URL derivations
    // stay safe for the no-workspace case.
    const editorPref = settings?.workspacePrefs.find(p => p.workspaceId === workspace?.workspaceId)?.editor ?? '';
    const terminalApp = settings?.terminalApp ?? 'default';
    const editorIconUrl = workspace === undefined
        ? ''
        : `/dev-dock/workspace-editor-icon?workspaceId=${encodeURIComponent(workspace.workspaceId)}&v=${encodeURIComponent(editorPref)}`;
    const terminalIconUrl = `/dev-dock/terminal-icon?app=${encodeURIComponent(terminalApp)}`;
    // Reconfiguring IDE/terminal in settings changes the URLs; a new URL must
    // re-try the image instead of keeping the old failure latch.
    useEffect(() => {
        setIconFailed({});
    }, [editorIconUrl, terminalIconUrl]);
    if (workspace === undefined) {
        // No workspace for this session: keep the seat but render nothing.
        return null;
    }
    const label = t(KIND_KEY[action]);
    const failSlot = (slot) => {
        setIconFailed(current => ({ ...current, [slot]: true }));
    };
    const run = async () => {
        if (state === 'busy')
            return;
        setState('busy');
        setError('');
        const answer = action === 'ide'
            ? await dataActions.openIde(workspace.workspaceId)
            : action === 'terminal'
                ? await dataActions.openTerminal(workspace.workspaceId)
                : await dataActions.start(workspace.workspaceId);
        if (answer.ok) {
            setState('ok');
            if (okTimer.current !== null)
                clearTimeout(okTimer.current);
            okTimer.current = setTimeout(() => { setState('idle'); }, 1500);
        }
        else {
            setError(answer.error ?? 'unknown error');
            setState('error');
            if (okTimer.current !== null)
                clearTimeout(okTimer.current);
            okTimer.current = setTimeout(() => { setState('idle'); }, 4000);
        }
    };
    const glyph = () => {
        if (action === 'ide') {
            if (iconFailed.ide === true)
                return _jsx(DevIdeAppIcon, { size: 16 });
            return _jsx("img", { className: css.appIcon, src: editorIconUrl, alt: "", onError: () => { failSlot('ide'); } });
        }
        if (action === 'terminal') {
            if (iconFailed.terminal === true)
                return _jsx(DevTerminalAppIcon, { size: 16 });
            return _jsx("img", { className: css.appIcon, src: terminalIconUrl, alt: "", onError: () => { failSlot('terminal'); } });
        }
        // Start: the combined tile, terminal upper-left and IDE lower-right.
        return _jsx(StartTile, { ideSrc: editorIconUrl, termSrc: terminalIconUrl });
    };
    const title = state === 'error'
        ? t('header.error', { error })
        : label;
    return (_jsx("button", { type: "button", className: `${css.button} ${state === 'error' ? css.error : ''}`, title: title, "aria-label": label, "aria-disabled": state === 'busy', onClick: () => { void run(); }, children: state === 'ok' ? _jsx(IconCheckOutline16, { size: 16 }) : glyph() }));
}
//# sourceMappingURL=SessionActionButton.js.map