/**
 * devDock settings namespace v2: per-workspace IDE preferences, editor
 * manual paths, terminal preference, and the start-work selection memory.
 * Projects are dsh workspaces, so no separate project registry exists.
 * Persisted through the settings capability (`$DSH_HOME/settings.yaml`,
 * namespace `dev-dock`).
 * @module @liyuera/dsh-dev-dock/schema
 */
import z from '@deepseek-ai/schemastery';
/** Branded settings namespace of this plugin. */
// 直接以字面量 brand（register 会校验小写连字符格式），不再经过已移除的工厂函数。
export const DEV_DOCK_NAMESPACE = 'dev-dock';
/** Schemastery schema for the whole document (registered by the host half). */
export const DevDockSettingsSchema = z.object({
    workspacePrefs: z.array(z.object({
        workspaceId: z.string().required(),
        editor: z.string().required(),
    })).default([]),
    editors: z.array(z.object({
        name: z.string().required(),
        detectedPath: z.string(),
        manualPath: z.string(),
    })).default([]),
    terminalApp: z.union([z.const('default'), z.const('iterm')]).default('default'),
    startWork: z.array(z.string()).default([]),
});
/** Empty settings document used as the schema base. */
export const EMPTY_DEV_DOCK_SETTINGS = {
    workspacePrefs: [],
    editors: [],
    terminalApp: 'default',
    startWork: [],
};
//# sourceMappingURL=schema.js.map