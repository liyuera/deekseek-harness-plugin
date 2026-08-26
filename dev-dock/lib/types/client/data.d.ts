/**
 * devDock browser data layer v2: mirrors the plugin's settings namespace
 * through settingsScope and exposes the desktop-action bridge. The bridge is
 * a same-origin POST to the plugin's host route (`/dev-dock/action`) because
 * static client bundles have no package-private RPC channel (host.call is a
 * dynamic-plugin builtin); the web server route is registered by the host
 * half and runs deterministic desktop actions.
 * @module @liyuera/dsh-dev-dock/client/data
 */
import { type SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client';
import type { ClientContext, SettingsScope } from '@deepseek-ai/dsh-client-runtime/client';
import type { DevDockSettings } from '../schema.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** The ui-settings settingsScope service. */
        settingsScope: {
            bind<T>(spec: {
                namespace: string;
                decode?: (section: unknown) => T | undefined;
            }): SettingsScope<T>;
        };
    }
}
/** Client-visible data snapshot: settings document plus readiness. */
export interface DevDockData {
    /** Loading until the first accepted settings section. */
    ready: boolean;
    /** The settings document; undefined before readiness. */
    settings: DevDockSettings | undefined;
}
/** One desktop-action request the browser half sends to the host route. */
export interface ActionRequest {
    action: 'list-editors' | 'open-ide' | 'open-terminal' | 'start' | 'start-work';
    workspaceId?: string;
    workspaceIds?: string[];
}
/** Unary host answer (list-editors rides editors on ok). */
export interface ActionResult {
    ok: boolean;
    error?: string;
}
/** Start-work answer shape from the host. */
export interface StartWorkResult {
    ok: boolean;
    opened: number;
    started: number;
    error?: string;
    items: Array<{
        workspaceId: string;
        ok: boolean;
        error?: string;
    }>;
}
/** Actions the UI may invoke on the data layer. */
export interface DevDockActions {
    /** Record one workspace's IDE preference (upsert by workspaceId). */
    setWorkspacePref(workspaceId: string, editor: string): Promise<void>;
    /** Record one editor's manual path (upsert by name). */
    setEditorManualPath(name: string, manualPath: string): Promise<void>;
    /** Record the terminal preference. */
    setTerminalApp(app: 'default' | 'iterm'): Promise<void>;
    /** Record the start-work selection memory. */
    setStartWork(workspaceIds: string[]): Promise<void>;
    /** Detect installed editors host-side and refresh the cache. */
    listEditors(): Promise<ActionResult>;
    /** Open the workspace in its default editor. */
    openIde(workspaceId: string): Promise<ActionResult>;
    /** Open a system terminal at the workspace. */
    openTerminal(workspaceId: string): Promise<ActionResult>;
    /** Open editor + terminal for one workspace. */
    start(workspaceId: string): Promise<ActionResult>;
    /** Open editor + terminal for the selected workspaces. */
    startWork(workspaceIds: string[]): Promise<StartWorkResult>;
}
/** Canonical editor names across platforms (union for stable UI display). */
export declare const EDITOR_NAMES: readonly ["WebStorm", "VS Code", "IntelliJ IDEA", "Cursor", "Sublime Text", "HBuilderX"];
/**
 * Create the devDock data layer for one client plugin fiber.
 * @param ctx - client root context (needs settingsScope).
 * @returns the settings mirror and the action facade.
 */
export declare function createDevDockData(ctx: ClientContext): {
    store: SnapshotStore<DevDockData>;
    actions: DevDockActions;
};
//# sourceMappingURL=data.d.ts.map