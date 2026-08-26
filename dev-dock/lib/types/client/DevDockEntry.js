import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import css from './DevDockEntry.module.css';
/**
 * The sidebar footer entry row.
 * @param props - footer owner state, view store, workspace list, translator.
 * @returns the entry button.
 */
export function DevDockEntry({ wide, useWorkspaces, actions, t }) {
    const count = useWorkspaces(state => state.items.length);
    const title = t('entry.title');
    if (!wide) {
        return (_jsx("button", { type: "button", className: css.railIcon, title: title, "aria-label": title, onClick: () => { actions.setOpen(true); }, children: _jsx("span", { className: css.railDot }) }));
    }
    return (_jsxs("button", { type: "button", className: css.row, title: t('entry.open'), onClick: () => { actions.setOpen(true); }, children: [_jsx("span", { className: css.title, children: title }), _jsx("span", { className: css.count, children: t('entry.projects', { count: String(count) }) })] }));
}
//# sourceMappingURL=DevDockEntry.js.map