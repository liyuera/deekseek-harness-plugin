/** `devDock` dictionary namespace. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'devDock'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'entry.title': 'devDock',
  'entry.projects': '{count} 个项目',
  'entry.open': '打开 devDock',
  'drawer.aria': 'devDock 面板',
  'drawer.title': 'devDock',
  'drawer.close': '关闭',
  'drawer.tab.projects': '项目',
  'drawer.tab.quickStart': '一键启动',
  'drawer.tab.import': '导入',
  'drawer.loading': '加载中...',
  'drawer.unavailable': '数据不可用',
  'projects.empty': '暂无项目，点击"导入"添加',
  'projects.import': '导入',
  'project.type.node': 'Node',
  'project.type.uniapp': 'UniApp',
  'project.type.miniapp': '小程序',
  'project.scripts': '{count} 个脚本',
  'project.openTerminal': '终端',
  'project.openIde': '打开',
  'project.remove': '删除',
  'project.remove.confirm': '确认删除项目「{name}」？仅移除插件配置，不删除磁盘文件。',
  'project.notFound': '项目不存在',
} as const

/** English dictionary. */
export const en: Record<keyof typeof zh, string> = {
  'entry.title': 'devDock',
  'entry.projects': '{count} projects',
  'entry.open': 'Open devDock',
  'drawer.aria': 'devDock panel',
  'drawer.title': 'devDock',
  'drawer.close': 'Close',
  'drawer.tab.projects': 'Projects',
  'drawer.tab.quickStart': 'Quick Start',
  'drawer.tab.import': 'Import',
  'drawer.loading': 'Loading...',
  'drawer.unavailable': 'Data unavailable',
  'projects.empty': 'No projects yet — click Import to add one',
  'projects.import': 'Import',
  'project.type.node': 'Node',
  'project.type.uniapp': 'UniApp',
  'project.type.miniapp': 'Miniapp',
  'project.scripts': '{count} scripts',
  'project.openTerminal': 'Terminal',
  'project.openIde': 'Open',
  'project.remove': 'Remove',
  'project.remove.confirm': 'Remove project "{name}"? Only the plugin configuration is removed; files on disk are untouched.',
  'project.notFound': 'Project not found',
}

/** Dictionary key type for typed translation. */
export type DevDockKey = keyof typeof zh
