/**
 * Host desktop actions: resolve the workspace IDE, open it, open a system
 * terminal at the workspace directory, and run the batch start-work flow.
 * All actions are deterministic (no agent, no approval prompt — the button
 * click is the user's authorization); the only guard is the sandbox mode:
 * `read-only` denies desktop side effects.
 * @module @liyuera/dsh-dev-dock/actions
 */
import type { DevDockSettings } from './schema.ts';
import type { PlatformFacts } from './platform/runner.ts';
/** Settings scope facade the desktop actions read and mutate. */
export interface DesktopScope {
    /** Read the current settings document. */
    get(): DevDockSettings;
    /** Merge a partial patch into the document. */
    update(patch: Partial<DevDockSettings>): void;
}
/** Minimal workspace record the actions need (live registry face). */
export interface DesktopWorkspace {
    /** Stable workspace registry id. */
    id: string;
    /** Canonical directory path. */
    path: string;
    /** Display title. */
    title: string;
}
/** Unary result of one desktop action. */
export type DesktopActionResult = {
    ok: true;
} | {
    ok: false;
    error: string;
};
/**
 * Whether a directory shows uni-app/miniapp traits (manifest.json markers).
 * @param workspacePath - canonical workspace directory.
 * @returns true when the traits are present.
 */
export declare function hasUniAppTraits(workspacePath: string): boolean;
/**
 * Default editor for one workspace: uni-app traits prefer HBuilderX, other
 * projects prefer WebStorm, then the remaining installed editors in order.
 * @param workspacePath - canonical workspace directory.
 * @param installed - detected editor names.
 * @returns the default editor name, or undefined when nothing is installed.
 */
export declare function defaultEditorFor(workspacePath: string, installed: readonly string[]): string | undefined;
/**
 * Resolve the executable path for one editor: manual path wins, then the
 * cached detected path, then a live detection pass.
 * @param scope - settings scope.
 * @param facts - platform facts.
 * @param editorName - canonical editor name.
 * @returns the resolved path or an error message.
 */
export declare function editorExecutablePath(scope: DesktopScope, facts: PlatformFacts, editorName: string): Promise<{
    ok: true;
    path: string;
} | {
    ok: false;
    error: string;
}>;
/**
 * Resolve which editor opens one workspace: the stored preference wins;
 * otherwise a default is derived from the content traits and installed
 * editors. The executable path is resolved from the same entry.
 * @param scope - settings scope.
 * @param facts - platform facts.
 * @param workspace - target workspace.
 * @returns editor name and executable path, or an error message.
 */
export declare function resolveWorkspaceEditor(scope: DesktopScope, facts: PlatformFacts, workspace: DesktopWorkspace): Promise<{
    ok: true;
    editor: string;
    path: string;
} | {
    ok: false;
    error: string;
}>;
/**
 * Open one workspace in its default editor.
 * @param scope - settings scope.
 * @param facts - platform facts.
 * @param workspace - target workspace.
 * @returns ok, or an error message.
 */
export declare function openIdeFor(scope: DesktopScope, facts: PlatformFacts, workspace: DesktopWorkspace): Promise<DesktopActionResult>;
/**
 * Open one workspace directory in a system terminal window.
 * @param scope - settings scope.
 * @param facts - platform facts.
 * @param workspace - target workspace.
 * @returns ok, or an error message.
 */
export declare function openTerminalFor(scope: DesktopScope, facts: PlatformFacts, workspace: DesktopWorkspace): Promise<DesktopActionResult>;
/**
 * Run the full start action for one workspace: editor first, then terminal.
 * @param scope - settings scope.
 * @param facts - platform facts.
 * @param workspace - target workspace.
 * @returns ok, or the first error (the other half is still attempted).
 */
export declare function startFor(scope: DesktopScope, facts: PlatformFacts, workspace: DesktopWorkspace): Promise<DesktopActionResult>;
/**
 * Run the start-work batch: for each selected workspace, open its editor and
 * a system terminal, with a gap between consecutive editor launches.
 * @param scope - settings scope.
 * @param facts - platform facts.
 * @param workspaces - selected workspaces in selection order.
 * @returns per-workspace results plus totals.
 */
export declare function startWorkFor(scope: DesktopScope, facts: PlatformFacts, workspaces: readonly DesktopWorkspace[]): Promise<{
    ok: boolean;
    opened: number;
    started: number;
    items: Array<{
        workspaceId: string;
        ok: boolean;
        error?: string;
    }>;
}>;
/** Whether an editor name is one of the known canonical names. */
export declare function isKnownEditor(name: string): boolean;
//# sourceMappingURL=actions.d.ts.map