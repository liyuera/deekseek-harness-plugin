/** `subagentSidebar` namespace dictionaries. */
/** Dictionary namespace owned by this plugin. */
export declare const NS = "subagentSidebar";
/** Simplified Chinese dictionary (the key-set source of truth). */
export declare const zh: {
    readonly 'capsule.title': "有子代理正在运行，点击查看";
    readonly 'capsule.label.one': "{count} 个子代理运行中";
    readonly 'capsule.label.other': "{count} 个子代理运行中";
    readonly 'panel.aria': "子代理总览";
    readonly 'panel.title': "子代理";
    readonly 'panel.total': "共 {total} 个";
    readonly 'panel.running': "运行中 {running}";
    readonly 'panel.close': "关闭";
    readonly 'panel.empty': "暂无子代理";
    readonly 'filter.runningOnly': "仅显示运行中";
    readonly 'root.count.one': "{count} 个子代理";
    readonly 'root.count.other': "{count} 个子代理";
    readonly 'root.runningCount': "{count} 个运行中";
    readonly 'root.expand': "展开 {title} 下的子代理";
    readonly 'root.collapse': "收起 {title} 下的子代理";
    readonly 'row.running': "正在运行";
    readonly 'row.idle': "空闲";
    readonly 'row.notRunning': "当前未运行";
    readonly 'row.continuable': "可继续";
    readonly 'row.oneShot': "一次性";
    readonly 'row.archived': "已归档";
    readonly 'row.expand': "展开下级子代理";
    readonly 'row.collapse': "收起下级子代理";
    readonly 'duration.exactTitle': "总活跃耗时：{duration}";
    readonly 'duration.seconds': "{seconds}秒";
    readonly 'duration.minutes': "{minutes}分{seconds}秒";
    readonly 'duration.hours': "{hours}小时{minutes}分{seconds}秒";
    readonly 'duration.days': "{days}天";
    readonly 'duration.daysHours': "{days}天{hours}小时";
    readonly 'duration.months': "约{months}个月";
    readonly 'duration.monthsDays': "约{months}个月{days}天";
    readonly 'duration.years': "约{years}年";
    readonly 'duration.yearsMonths': "约{years}年{months}个月";
    readonly 'duration.exactDays': "{days}天{hours}小时{minutes}分{seconds}秒";
};
/** English dictionary, key-identical to the Chinese source of truth. */
export declare const en: Record<SubagentSidebarKey, string>;
/** Key domain of the `subagentSidebar` namespace (zh is the source of truth). */
export type SubagentSidebarKey = keyof typeof zh;
//# sourceMappingURL=locales.d.ts.map