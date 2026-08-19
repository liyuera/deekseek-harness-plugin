/** `devDock` dictionary namespace. */
/** Dictionary namespace owned by this plugin. */
export declare const NS = "devDock";
/** Simplified Chinese dictionary (the key-set source of truth). */
export declare const zh: {
    readonly 'entry.title': "devDock";
    readonly 'entry.projects': "{count} 个项目";
    readonly 'entry.open': "打开 devDock";
    readonly 'drawer.aria': "devDock 面板";
    readonly 'drawer.title': "devDock";
    readonly 'drawer.close': "关闭";
    readonly 'drawer.tab.projects': "项目";
    readonly 'drawer.tab.quickStart': "一键启动";
    readonly 'drawer.tab.import': "导入";
    readonly 'drawer.loading': "加载中...";
    readonly 'drawer.unavailable': "数据不可用";
    readonly 'projects.empty': "暂无项目，点击\"导入\"添加";
    readonly 'projects.import': "导入";
    readonly 'project.type.node': "Node";
    readonly 'project.type.uniapp': "UniApp";
    readonly 'project.type.miniapp': "小程序";
    readonly 'project.scripts': "{count} 个脚本";
    readonly 'project.openTerminal': "终端";
    readonly 'project.openIde': "打开";
    readonly 'project.remove': "删除";
    readonly 'project.remove.confirm': "确认删除项目「{name}」？仅移除插件配置，不删除磁盘文件。";
    readonly 'project.notFound': "项目不存在";
};
/** English dictionary. */
export declare const en: Record<keyof typeof zh, string>;
/** Dictionary key type for typed translation. */
export type DevDockKey = keyof typeof zh;
//# sourceMappingURL=locales.d.ts.map