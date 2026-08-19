import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * devDock overlay drawer: a right-docked panel with page tabs (projects,
 * quick-start, import). Rendered into `shell.overlay`; open state rides the
 * shared viewing store.
 */
import { useEffect, useRef } from 'react';
import { ProjectListPage } from "./pages/ProjectListPage.js";
import { QuickStartPage } from "./pages/QuickStartPage.js";
import { ImportPage } from "./pages/ImportPage.js";
import css from './DevDockDrawer.module.css';
/** Page tabs with their locale keys. */
const TABS = [
    { page: 'projects', key: 'drawer.tab.projects' },
    { page: 'quickStart', key: 'drawer.tab.quickStart' },
    { page: 'import', key: 'drawer.tab.import' },
];
/**
 * The devDock overlay drawer.
 * @param props - overlay runtime, view store, data hook, actions, translator.
 * @returns the drawer panel, or null when closed.
 */
export function DevDockDrawer({ useStore, actions: view, useDevDockData, dataActions, promptAgent, pickDirectory, t }) {
    const { open, page } = useStore(state => state);
    const panelRef = useRef(null);
    // Close on Escape; focus lands on the panel on open.
    useEffect(() => {
        if (!open)
            return;
        const onKeyDown = (e) => {
            if (e.key === 'Escape')
                view.setOpen(false);
        };
        document.addEventListener('keydown', onKeyDown);
        panelRef.current?.focus();
        return () => { document.removeEventListener('keydown', onKeyDown); };
    }, [open, view]);
    if (!open)
        return null;
    const navigate = (page) => { view.setPage(page); };
    const pageProps = {
        useDevDockData,
        actions: dataActions,
        promptAgent,
        pickDirectory,
        t,
        onNavigate: navigate,
    };
    return (_jsxs("div", { className: css.root, role: "presentation", children: [_jsx("div", { className: css.mask, "aria-hidden": "true", onClick: () => { view.setOpen(false); } }), _jsxs("div", { ref: panelRef, className: css.panel, role: "dialog", "aria-modal": "true", "aria-label": t('drawer.title'), tabIndex: -1, children: [_jsxs("nav", { className: css.tabs, "aria-label": t('drawer.title'), children: [TABS.map((tab) => (_jsx("button", { type: "button", className: tab.page === page ? css.tabActive : css.tab, "aria-current": tab.page === page ? 'true' : undefined, onClick: () => { view.setPage(tab.page); }, children: t(tab.key) }, tab.page))), _jsx("button", { type: "button", className: css.close, "aria-label": t('drawer.close'), onClick: () => { view.setOpen(false); }, children: "\u00D7" })] }), _jsxs("div", { className: css.content, children: [page === 'projects' && _jsx(ProjectListPage, { ...pageProps }), page === 'quickStart' && _jsx(QuickStartPage, { ...pageProps }), page === 'import' && _jsx(ImportPage, { ...pageProps })] })] })] }));
}
//# sourceMappingURL=DevDockDrawer.js.map