/**
 * devDock settings namespace v2: per-workspace IDE preferences, editor
 * manual paths, terminal preference, and the start-work selection memory.
 * Projects are dsh workspaces, so no separate project registry exists.
 * Persisted through the settings capability (`$DSH_HOME/settings.yaml`,
 * namespace `dev-dock`).
 * @module @liyuera/dsh-dev-dock/schema
 */
import z from '@deepseek-ai/schemastery';
import { settingsNamespace } from '@deepseek-ai/dsh-settings';
/** Branded settings namespace of this plugin. */
export const DEV_DOCK_NAMESPACE = settingsNamespace('dev-dock');
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