/**
 * devDock settings namespace: project registry, editor configuration, and
 * quick-start plans. Persisted through the settings capability
 * (`$DSH_HOME/settings.yaml`, namespace `dev-dock`).
 * @module @liyuera/dsh-dev-dock/schema
 */
import z from '@deepseek-ai/schemastery';
import { settingsNamespace } from '@deepseek-ai/dsh-settings';
/** Branded settings namespace of this plugin. */
export const DEV_DOCK_NAMESPACE = settingsNamespace('dev-dock');
/** Schemastery schema for the whole document (registered by the host half). */
export const DevDockSettingsSchema = z.object({
    projects: z.array(z.object({
        id: z.string().required(),
        name: z.string().required(),
        path: z.string().required(),
        alias: z.string(),
        type: z.union([z.const('node'), z.const('uniapp'), z.const('miniapp')]).required(),
        packageManager: z.union([z.const('npm'), z.const('pnpm'), z.const('yarn')]).required(),
        nodeVersion: z.string(),
        scripts: z.dict(z.string()).required(),
        buildCommand: z.string(),
        createdAt: z.string().required(),
    })).default([]),
    editors: z.array(z.object({
        name: z.string().required(),
        detectedPath: z.string(),
        manualPath: z.string(),
    })).default([]),
    quickStarts: z.array(z.object({
        name: z.string().required(),
        items: z.array(z.object({
            projectId: z.string().required(),
            ides: z.array(z.string()).required(),
            script: z.string(),
        })).required(),
    })).default([]),
    terminalApp: z.union([z.const('default'), z.const('iterm')]).default('default'),
});
/** Empty settings document used as the schema base. */
export const EMPTY_DEV_DOCK_SETTINGS = {
    projects: [],
    editors: [],
    quickStarts: [],
    terminalApp: 'default',
};
//# sourceMappingURL=schema.js.map