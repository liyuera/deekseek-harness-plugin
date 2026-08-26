/**
 * devDock v2 browser copy: entry row, start-work dialog, per-session header
 * actions (IDE / terminal / start), and the settings page. Simplified from
 * v1: projects are dsh workspaces; desktop actions are deterministic.
 * @module @liyuera/dsh-dev-dock/client/locales
 */

/** devDock dictionary keys. */
export const NS = 'devDock' as const

/** zh dict. */
export const zh = {
  'start.button': '开始上班',
  'start.notice': '选择要启动的工作区项目（记住上次选择）',
  'start.confirm': '启动',
  'start.cancel': '取消',
  'start.running': '正在启动…',
  'start.done': '已打开 {opened} 个编辑器、{started} 个终端窗口',
  'start.empty': '没有可用的工作区项目',
  'start.noWorkspace': '请先在工作区添加项目',
  'header.ide': '用 IDE 打开',
  'header.terminal': '打开系统终端',
  'header.start': '启动（IDE + 终端）',
  'header.noWorkspace': '当前会话没有关联工作区',
  'header.error': '操作失败：{error}',
  'settings.title': 'devDock',
  'settings.workspacePref.title': '工作区编辑器偏好',
  'settings.workspacePref.hint': '给每个工作区选择打开用的 IDE；不选则按内容自动检测（uni-app → HBuilderX，其它 → WebStorm）。',
  'settings.editors.title': '编辑器',
  'settings.editors.refresh': '重新检测',
  'settings.editors.manual': '手动路径',
  'settings.editors.save': '保存',
  'settings.editors.hint': '检测不到或需要指定时，可手动填写（如 HBuilderX）。',
  'settings.terminal.title': '终端',
  'settings.terminal.default': 'Terminal.app（默认）',
  'settings.terminal.iterm': 'iTerm2',
} as const

/** en dict. */
export const en = {
  'start.button': 'Start Work',
  'start.notice': 'Select workspace projects to start (last selection remembered)',
  'start.confirm': 'Start',
  'start.cancel': 'Cancel',
  'start.running': 'Starting…',
  'start.done': 'Opened {opened} editor(s) and {started} terminal(s)',
  'start.empty': 'No workspace projects available',
  'start.noWorkspace': 'Add projects in the workspace area first',
  'header.ide': 'Open in IDE',
  'header.terminal': 'Open system terminal',
  'header.start': 'Start (IDE + terminal)',
  'header.noWorkspace': 'This session has no associated workspace',
  'header.error': 'Action failed: {error}',
  'settings.title': 'devDock',
  'settings.workspacePref.title': 'Workspace editor preference',
  'settings.workspacePref.hint': 'Pick the IDE each workspace opens with; auto-detected when unset (uni-app → HBuilderX, other → WebStorm).',
  'settings.editors.title': 'Editors',
  'settings.editors.refresh': 'Re-detect',
  'settings.editors.manual': 'Manual path',
  'settings.editors.save': 'Save',
  'settings.editors.hint': 'Set a manual path when detection misses (e.g. HBuilderX).',
  'settings.terminal.title': 'Terminal',
  'settings.terminal.default': 'Terminal.app (default)',
  'settings.terminal.iterm': 'iTerm2',
} as const

/** Full key type of the devDock dictionary. */
export type DevDockKey = keyof typeof zh
