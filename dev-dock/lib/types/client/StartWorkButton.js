import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { StartTile } from "./StartTile.js";
import css from './StartWorkButton.module.css';
/**
 * The sidebar footer start-work button.
 * @param props - footer owner state, view store, settings mirror, translator.
 * @returns the button row.
 */
export function StartWorkButton({ wide, useWorkspaces, useDevDockData, actions, t }) {
    const label = t('start.button');
    const settings = useDevDockData(data => data.settings);
    // The tile wears real app icons: the first workspace's configured editor
    // plus the configured terminal app (a global entry has no single session).
    const firstWorkspaceId = useWorkspaces(state => state.items[0]?.workspaceId);
    const editorPref = settings?.workspacePrefs.find(p => p.workspaceId === firstWorkspaceId)?.editor ?? '';
    const ideSrc = firstWorkspaceId === undefined
        ? undefined
        : `/dev-dock/workspace-editor-icon?workspaceId=${encodeURIComponent(firstWorkspaceId)}&v=${encodeURIComponent(editorPref)}`;
    const termSrc = `/dev-dock/terminal-icon?app=${encodeURIComponent(settings?.terminalApp ?? 'default')}`;
    if (!wide) {
        return (_jsx("button", { type: "button", className: css.railButton, title: label, "aria-label": label, onClick: () => { actions.setOpen(true); }, children: _jsx(StartTile, { ideSrc: ideSrc, termSrc: termSrc, size: 18 }) }));
    }
    return (_jsxs("button", { type: "button", className: css.row, title: label, onClick: () => { actions.setOpen(true); }, children: [_jsx(StartTile, { ideSrc: ideSrc, termSrc: termSrc }), _jsx("span", { className: css.label, children: label })] }));
}
//# sourceMappingURL=StartWorkButton.js.map