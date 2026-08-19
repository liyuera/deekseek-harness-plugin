import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import css from './ProjectListPage.module.css';
/** Project kind label key. */
const TYPE_KEYS = {
    node: 'project.type.node',
    uniapp: 'project.type.uniapp',
    miniapp: 'project.type.miniapp',
};
/**
 * Render the projects page.
 * @param props - data hook, actions, navigator, translator.
 * @returns the project list.
 */
export function ProjectListPage({ useDevDockData, actions, promptAgent, onNavigate, t }) {
    const settings = useDevDockData(data => data.settings);
    const remove = async (project) => {
        if (!window.confirm(t('project.remove.confirm', { name: project.name })))
            return;
        await actions.removeProject(project.id);
    };
    const openTerminal = (project) => {
        void promptAgent(`使用 dev-dock_open-terminal 打开项目 ${project.name}（id=${project.id}）的终端`);
    };
    const openIde = (project) => {
        void promptAgent(`使用 dev-dock_open-ide 用编辑器打开项目 ${project.name}（id=${project.id}）`);
    };
    return (_jsxs("div", { className: css.page, children: [_jsxs("div", { className: css.header, children: [_jsx("h2", { className: css.title, children: t('drawer.title') }), _jsx("span", { className: css.count, children: t('entry.projects', { count: String(settings?.projects.length ?? 0) }) })] }), settings === undefined ? (_jsx("p", { className: css.empty, children: t('drawer.loading') })) : settings.projects.length === 0 ? (_jsx("p", { className: css.empty, children: t('projects.empty') })) : (_jsx("ul", { className: css.list, children: settings.projects.map((project) => (_jsxs("li", { className: css.card, children: [_jsxs("div", { className: css.cardHeader, children: [_jsx("span", { className: css.name, title: project.path, children: project.name }), _jsx("span", { className: css.badge, children: t(TYPE_KEYS[project.type]) })] }), _jsxs("div", { className: css.meta, children: [_jsx("span", { className: css.pm, children: project.packageManager }), _jsx("span", { className: css.scripts, children: t('project.scripts', { count: String(Object.keys(project.scripts).length) }) })] }), _jsxs("div", { className: css.cardActions, children: [_jsx("button", { type: "button", className: css.action, onClick: () => { void openTerminal(project); }, children: t('project.openTerminal') }), _jsx("button", { type: "button", className: css.action, onClick: () => { void openIde(project); }, children: t('project.openIde') }), _jsx("button", { type: "button", className: css.actionDanger, onClick: () => { void remove(project); }, children: t('project.remove') })] })] }, project.id))) })), _jsx("button", { type: "button", className: css.importButton, onClick: () => { onNavigate('import'); }, children: t('projects.import') })] }));
}
//# sourceMappingURL=ProjectListPage.js.map