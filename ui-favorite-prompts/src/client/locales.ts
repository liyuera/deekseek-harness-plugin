/** Copy dictionaries for the favorite-prompts plugin. */

/** Simplified Chinese dictionary and key source of truth. */
export const zh = {
  'nav': '收藏提示词',
  'group': '收藏',
  'strip.cites': '引用了',
  'strip.citesSeparator': '、',
  'strip.notFound': '（未找到）',
  'strip.omitted': '另有 {count} 条未展开',
  'strip.expand': '展开引用的提示词',
  'strip.collapse': '收起引用的提示词',
  'strip.favorite': '收藏这条提示词',
  'strip.unfavorite': '取消收藏',
  'strip.undo': '撤销',
  'strip.undone': '已取消收藏',
  'strip.added': '已收藏',
  'strip.failed': '操作失败，请重试',
  'settings.new': '新增收藏',
  'settings.empty': '还没有收藏。在任意一条自己发出的消息下方点书签图标即可收藏。',
  'settings.unavailable': '收藏服务不可用：{reason}',
  'settings.loading': '正在读取收藏…',
  'settings.save': '保存',
  'settings.cancel': '取消',
  'settings.edit': '编辑',
  'settings.delete': '删除',
  'settings.confirmDelete': '确认删除',
  'settings.name': '名字',
  'settings.text': '提示词正文',
  'settings.namePlaceholder': '用于 @ 引用的名字（字母、数字、中文或连字符）',
  'settings.renameFailed': '改名失败：{reason}',
  'settings.placeholder': '粘贴或输入一段提示词',
  'settings.createdAt': '收藏于 {time}',
} satisfies Record<string, string>

/** Favorite-prompts locale key union. */
export type FavoritePromptsKey = keyof typeof zh

/** English dictionary checked against the Chinese key set. */
export const en = {
  'nav': 'Saved prompts',
  'group': 'Saved',
  'strip.cites': 'Cites',
  'strip.citesSeparator': ', ',
  'strip.notFound': ' (not found)',
  'strip.omitted': '{count} more not expanded',
  'strip.expand': 'Show cited prompts',
  'strip.collapse': 'Hide cited prompts',
  'strip.favorite': 'Save this prompt',
  'strip.unfavorite': 'Remove from saved',
  'strip.undo': 'Undo',
  'strip.undone': 'Removed',
  'strip.added': 'Saved',
  'strip.failed': 'Failed, please retry',
  'settings.new': 'New saved prompt',
  'settings.empty': 'Nothing saved yet. Use the bookmark button under any message you sent.',
  'settings.unavailable': 'Saved prompts are unavailable: {reason}',
  'settings.loading': 'Reading saved prompts…',
  'settings.save': 'Save',
  'settings.cancel': 'Cancel',
  'settings.edit': 'Edit',
  'settings.delete': 'Delete',
  'settings.confirmDelete': 'Confirm delete',
  'settings.name': 'Name',
  'settings.text': 'Prompt text',
  'settings.namePlaceholder': 'Name used by @ mentions (letters, digits, CJK, hyphens)',
  'settings.renameFailed': 'Rename failed: {reason}',
  'settings.placeholder': 'Paste or type a prompt',
  'settings.createdAt': 'Saved {time}',
} satisfies Record<FavoritePromptsKey, string>

/** Dictionary namespace owned by this plugin. */
export const NS = 'favoritePrompts'
