/**
 * devDock document v2: per-workspace IDE preferences, editor manual paths,
 * terminal preference, and the start-work selection memory. Projects are dsh
 * workspaces, so no separate project registry exists. Persisted through the
 * storage capability (`$DSH_HOME/storages/dev_dock.json`, domain `dev_dock`).
 * @module @liyuera/dsh-dev-dock/schema
 */
import { z } from 'zod';
/** Workspace id (dsh workspace registry id) one IDE preference is keyed by. */
export type WorkspacePrefKey = string;
/** One known editor: auto-detected path and/or user-configured path. */
export interface EditorRecord {
    /** Canonical editor name (WebStorm, VS Code, IntelliJ IDEA, Cursor, Sublime Text, HBuilderX). */
    name: string;
    /** Auto-detected executable/app path (empty when not installed). */
    detectedPath?: string | undefined;
    /** User-configured executable/app path (HBuilderX relies on this). */
    manualPath?: string | undefined;
}
/** Whole devDock document. */
export interface DevDockSettings {
    /** Per-workspace IDE preference (falls back to auto-detection defaults). */
    workspacePrefs: Array<{
        workspaceId: WorkspacePrefKey;
        editor: string;
    }>;
    /** Editor detection cache plus user-configured paths. */
    editors: EditorRecord[];
    /** macOS terminal preference; 'default' uses Terminal.app, 'iterm' iTerm. */
    terminalApp: 'default' | 'iterm';
    /** Workspace ids of the last start-work selection (dialog prefill). */
    startWork: string[];
}
/**
 * Storage domain holding the document. `UNIT_NAME_RE` forbids hyphens, so the
 * domain name is underscored while the HTTP paths keep the hyphenated form.
 */
export declare const DEV_DOCK_DOMAIN = "dev_dock";
/** The four fields the browser half may write, one at a time. */
export declare const DEV_DOCK_FIELDS: readonly ["workspacePrefs", "editors", "terminalApp", "startWork"];
/** One field name the browser half may write. */
export type DevDockField = (typeof DEV_DOCK_FIELDS)[number];
/**
 * Document schema. Doubles as the storage domain's global schema (validated at
 * the durable read boundary) and as the write guard for the browser route: a
 * patch that would store a document this schema rejects is refused before it
 * reaches the medium.
 */
export declare const DevDockDocumentSchema: z.ZodType<DevDockSettings>;
/** Document served before the first write. */
export declare const EMPTY_DEV_DOCK_SETTINGS: DevDockSettings;
//# sourceMappingURL=schema.d.ts.map