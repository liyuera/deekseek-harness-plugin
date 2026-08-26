/**
 * devDock v2 browser copy: entry row, start-work dialog, per-session header
 * actions (IDE / terminal / start), and the settings page. Simplified from
 * v1: projects are dsh workspaces; desktop actions are deterministic.
 * @module @liyuera/dsh-dev-dock/client/locales
 */
/** devDock dictionary keys. */
export declare const NS: "devDock";
/** zh dict. */
export declare const zh: {
    readonly 'start.button': "开始上班";
    readonly 'start.notice': "选择要启动的工作区项目（记住上次选择）";
    readonly 'start.confirm': "启动";
    readonly 'start.cancel': "取消";
    readonly 'start.running': "正在启动…";
    readonly 'start.done': "已打开 {opened} 个编辑器、{started} 个终端窗口";
    readonly 'start.empty': "没有可用的工作区项目";
    readonly 'start.noWorkspace': "请先在工作区添加项目";
    readonly 'header.ide': "用 IDE 打开";
    readonly 'header.terminal': "打开系统终端";
    readonly 'header.start': "启动（IDE + 终端）";
    readonly 'header.noWorkspace': "当前会话没有关联工作区";
    readonly 'header.error': "操作失败：{error}";
    readonly 'settings.title': "devDock";
    readonly 'settings.workspacePref.title': "工作区编辑器偏好";
    readonly 'settings.workspacePref.hint': "给每个工作区选择打开用的 IDE；不选则按内容自动检测（uni-app → HBuilderX，其它 → WebStorm）。";
    readonly 'settings.editors.title': "编辑器";
    readonly 'settings.editors.refresh': "重新检测";
    readonly 'settings.editors.manual': "手动路径";
    readonly 'settings.editors.save': "保存";
    readonly 'settings.editors.hint': "检测不到或需要指定时，可手动填写（如 HBuilderX）。";
    readonly 'settings.terminal.title': "终端";
    readonly 'settings.terminal.default': "Terminal.app（默认）";
    readonly 'settings.terminal.iterm': "iTerm2";
};
/** en dict. */
export declare const en: {
    readonly 'start.button': "Start Work";
    readonly 'start.notice': "Select workspace projects to start (last selection remembered)";
    readonly 'start.confirm': "Start";
    readonly 'start.cancel': "Cancel";
    readonly 'start.running': "Starting…";
    readonly 'start.done': "Opened {opened} editor(s) and {started} terminal(s)";
    readonly 'start.empty': "No workspace projects available";
    readonly 'start.noWorkspace': "Add projects in the workspace area first";
    readonly 'header.ide': "Open in IDE";
    readonly 'header.terminal': "Open system terminal";
    readonly 'header.start': "Start (IDE + terminal)";
    readonly 'header.noWorkspace': "This session has no associated workspace";
    readonly 'header.error': "Action failed: {error}";
    readonly 'settings.title': "devDock";
    readonly 'settings.workspacePref.title': "Workspace editor preference";
    readonly 'settings.workspacePref.hint': "Pick the IDE each workspace opens with; auto-detected when unset (uni-app → HBuilderX, other → WebStorm).";
    readonly 'settings.editors.title': "Editors";
    readonly 'settings.editors.refresh': "Re-detect";
    readonly 'settings.editors.manual': "Manual path";
    readonly 'settings.editors.save': "Save";
    readonly 'settings.editors.hint': "Set a manual path when detection misses (e.g. HBuilderX).";
    readonly 'settings.terminal.title': "Terminal";
    readonly 'settings.terminal.default': "Terminal.app (default)";
    readonly 'settings.terminal.iterm': "iTerm2";
};
/** Full key type of the devDock dictionary. */
export type DevDockKey = keyof typeof zh;
//# sourceMappingURL=locales.d.ts.map