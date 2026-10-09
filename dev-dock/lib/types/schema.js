/**
 * devDock document v2: per-workspace IDE preferences, editor manual paths,
 * terminal preference, and the start-work selection memory. Projects are dsh
 * workspaces, so no separate project registry exists. Persisted through the
 * storage capability (`$DSH_HOME/storages/dev_dock.json`, domain `dev_dock`).
 * @module @liyuera/dsh-dev-dock/schema
 */
import { z } from 'zod';
/**
 * Storage domain holding the document. `UNIT_NAME_RE` forbids hyphens, so the
 * domain name is underscored while the HTTP paths keep the hyphenated form.
 */
export const DEV_DOCK_DOMAIN = 'dev_dock';
/** The four fields the browser half may write, one at a time. */
export const DEV_DOCK_FIELDS = ['workspacePrefs', 'editors', 'terminalApp', 'startWork'];
/**
 * Document schema. Doubles as the storage domain's global schema (validated at
 * the durable read boundary) and as the write guard for the browser route: a
 * patch that would store a document this schema rejects is refused before it
 * reaches the medium.
 */
export const DevDockDocumentSchema = z.object({
    workspacePrefs: z.array(z.object({
        workspaceId: z.string().min(1),
        editor: z.string().min(1),
    })).default([]),
    editors: z.array(z.object({
        name: z.string().min(1),
        detectedPath: z.string().optional(),
        manualPath: z.string().optional(),
    })).default([]),
    terminalApp: z.union([z.literal('default'), z.literal('iterm')]).default('default'),
    startWork: z.array(z.string()).default([]),
});
/** Document served before the first write. */
export const EMPTY_DEV_DOCK_SETTINGS = {
    workspacePrefs: [],
    editors: [],
    terminalApp: 'default',
    startWork: [],
};
//# sourceMappingURL=schema.js.map