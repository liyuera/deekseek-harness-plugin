/**
 * devDock settings namespace v2: per-workspace IDE preferences, editor
 * manual paths, terminal preference, and the start-work selection memory.
 * Projects are dsh workspaces, so no separate project registry exists.
 * Persisted through the settings capability (`$DSH_HOME/settings.yaml`,
 * namespace `dev-dock`).
 * @module @liyuera/dsh-dev-dock/schema
 */
import z from '@deepseek-ai/schemastery';
import type { SettingsNamespace } from '@deepseek-ai/dsh-settings';
/** Workspace id (dsh workspace registry id) one IDE preference is keyed by. */
export type WorkspacePrefKey = string;
/** One known editor: auto-detected path and/or user-configured path. */
export interface EditorRecord {
    /** Canonical editor name (WebStorm, VS Code, IntelliJ IDEA, Cursor, Sublime Text, HBuilderX). */
    name: string;
    /** Auto-detected executable/app path (empty when not installed). */
    detectedPath?: string;
    /** User-configured executable/app path (HBuilderX relies on this). */
    manualPath?: string;
}
/** Whole devDock settings document. */
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
/** Branded settings namespace of this plugin. */
export declare const DEV_DOCK_NAMESPACE: SettingsNamespace;
/** Schemastery schema for the whole document (registered by the host half). */
export declare const DevDockSettingsSchema: z<DevDockSettings>;
/** Empty settings document used as the schema base. */
export declare const EMPTY_DEV_DOCK_SETTINGS: DevDockSettings;
//# sourceMappingURL=schema.d.ts.map