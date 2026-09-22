/**
 * Host desktop actions: resolve the workspace IDE, open it, open a system
 * terminal at the workspace directory, and run the batch start-work flow.
 * All actions are deterministic (no agent, no approval prompt — the button
 * click is the user's authorization); the only guard is the sandbox mode:
 * `read-only` denies desktop side effects.
 * @module @liyuera/dsh-dev-dock/actions
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { openProjectInIde } from "./platform/open-ide.js";
import { openProjectTerminal } from "./platform/open-terminal.js";
import { detectEditors, KNOWN_EDITORS, PREFERRED_EDITORS } from "./editors.js";
/** Gap between consecutive IDE launches in a start-work batch. */
const IDE_LAUNCH_GAP_MS = 1200;
/** How long to wait for the editor process after its first launch. */
const IDE_LAUNCH_WAIT_MS = 20000;
/** Poll interval while waiting for the editor process. */
const IDE_LAUNCH_POLL_MS = 400;
/** How long to settle after the editor process appears. */
const IDE_LAUNCH_SETTLE_MS = 800;
/**
 * Whether a directory shows uni-app/miniapp traits (manifest.json markers).
 * @param workspacePath - canonical workspace directory.
 * @returns true when the traits are present.
 */
export function hasUniAppTraits(workspacePath) {
    return existsSync(join(workspacePath, 'manifest.json'))
        || existsSync(join(workspacePath, 'src', 'manifest.json'))
        || existsSync(join(workspacePath, 'project.config.json'));
}
/**
 * Default editor for one workspace: uni-app traits prefer HBuilderX, other
 * projects prefer WebStorm, then the remaining installed editors in order.
 * @param workspacePath - canonical workspace directory.
 * @param installed - detected editor names.
 * @returns the default editor name, or undefined when nothing is installed.
 */
export function defaultEditorFor(workspacePath, installed) {
    if (installed.length === 0)
        return undefined;
    if (hasUniAppTraits(workspacePath)) {
        if (installed.includes('HBuilderX'))
            return 'HBuilderX';
        return installed[0];
    }
    for (const name of PREFERRED_EDITORS) {
        if (installed.includes(name))
            return name;
    }
    return installed[0];
}
/**
 * Resolve the executable path for one editor: manual path wins, then the
 * cached detected path, then a live detection pass.
 * @param scope - settings scope.
 * @param facts - platform facts.
 * @param editorName - canonical editor name.
 * @returns the resolved path or an error message.
 */
export async function editorExecutablePath(scope, facts, editorName) {
    const stored = scope.get().editors.find((e) => e.name === editorName);
    if (stored?.manualPath)
        return { ok: true, path: stored.manualPath };
    if (stored?.detectedPath)
        return { ok: true, path: stored.detectedPath };
    const detected = await detectEditors(facts);
    const path = detected[editorName];
    if (path === undefined) {
        const hint = editorName === 'HBuilderX'
            ? ' (configure its path in the devDock settings page)'
            : '';
        return { ok: false, error: `editor ${editorName} not found${hint}` };
    }
    return { ok: true, path };
}
/**
 * Resolve which editor opens one workspace: the stored preference wins;
 * otherwise a default is derived from the content traits and installed
 * editors. The executable path is resolved from the same entry.
 * @param scope - settings scope.
 * @param facts - platform facts.
 * @param workspace - target workspace.
 * @returns editor name and executable path, or an error message.
 */
export async function resolveWorkspaceEditor(scope, facts, workspace) {
    const preferred = scope.get().workspacePrefs.find((p) => p.workspaceId === workspace.id)?.editor;
    if (preferred !== undefined) {
        const resolved = await editorExecutablePath(scope, facts, preferred);
        return resolved.ok ? { ok: true, editor: preferred, path: resolved.path } : resolved;
    }
    const detected = await detectEditors(facts);
    const installed = Object.keys(detected);
    const editor = defaultEditorFor(workspace.path, installed);
    if (editor === undefined) {
        return { ok: false, error: 'no code editor detected; configure one in the devDock settings page' };
    }
    const path = detected[editor];
    if (path === undefined) {
        return { ok: false, error: `editor ${editor} detection returned no path` };
    }
    return { ok: true, editor, path };
}
/**
 * Open one workspace in its default editor.
 * @param scope - settings scope.
 * @param facts - platform facts.
 * @param workspace - target workspace.
 * @returns ok, or an error message.
 */
export async function openIdeFor(scope, facts, workspace) {
    const resolved = await resolveWorkspaceEditor(scope, facts, workspace);
    if (!resolved.ok)
        return resolved;
    return openProjectInIde(facts, workspace.path, resolved.editor, resolved.path);
}
/**
 * Open one workspace directory in a system terminal window.
 * @param scope - settings scope.
 * @param facts - platform facts.
 * @param workspace - target workspace.
 * @returns ok, or an error message.
 */
export async function openTerminalFor(scope, facts, workspace) {
    const preferIterm = scope.get().terminalApp === 'iterm';
    return openProjectTerminal(facts, workspace.path, undefined, preferIterm);
}
/**
 * Run the full start action for one workspace: editor first, then terminal.
 * @param scope - settings scope.
 * @param facts - platform facts.
 * @param workspace - target workspace.
 * @returns ok, or the first error (the other half is still attempted).
 */
export async function startFor(scope, facts, workspace) {
    const ide = await openIdeFor(scope, facts, workspace);
    const terminal = await openTerminalFor(scope, facts, workspace);
    if (!ide.ok)
        return ide;
    if (!terminal.ok)
        return terminal;
    return { ok: true };
}
/**
 * Run the start-work batch: for each selected workspace, open its editor and
 * a system terminal, with a gap between consecutive editor launches.
 * @param scope - settings scope.
 * @param facts - platform facts.
 * @param workspaces - selected workspaces in selection order.
 * @returns per-workspace results plus totals.
 */
export async function startWorkFor(scope, facts, workspaces) {
    const items = [];
    let opened = 0;
    let started = 0;
    // The batch opens one editor app repeatedly; macOS LaunchServices merges
    // `open` calls that hit a cold-starting app, so wait for the process to be
    // up before the next launch.
    let lastEditorAppPath;
    for (const workspace of workspaces) {
        const ide = await resolveWorkspaceEditor(scope, facts, workspace);
        if (ide.ok && lastEditorAppPath !== undefined && facts.platform === 'darwin') {
            await waitForAppProcess(facts, lastEditorAppPath);
        }
        const ideResult = ide.ok
            ? await openProjectInIde(facts, workspace.path, ide.editor, ide.path)
            : { ok: false, error: ide.error };
        if (ide.ok)
            lastEditorAppPath = ide.path;
        const terminal = await openTerminalFor(scope, facts, workspace);
        if (ideResult.ok)
            opened++;
        if (terminal.ok)
            started++;
        const item = {
            workspaceId: workspace.id,
            ok: ideResult.ok && terminal.ok,
        };
        if (!ideResult.ok)
            item.error = ideResult.error;
        else if (!terminal.ok)
            item.error = terminal.error;
        items.push(item);
        await new Promise((resolve) => setTimeout(resolve, IDE_LAUNCH_GAP_MS));
    }
    return {
        ok: items.every((item) => item.ok),
        opened,
        started,
        items,
    };
}
/**
 * Wait until one editor app path has a live process (bounded). LaunchServices
 * hands a second `open -a <App>` to the running instance; if that instance is
 * still cold, the directory event can be lost, so subsequent launches wait
 * for it.
 * @param facts - platform facts with the injectable runner.
 * @param appPath - editor .app path launched first.
 */
async function waitForAppProcess(facts, appPath) {
    const signal = new AbortController().signal;
    const deadline = Date.now() + IDE_LAUNCH_WAIT_MS;
    while (Date.now() < deadline) {
        try {
            const { stdout } = await facts.run('pgrep', ['-f', appPath], signal);
            if (stdout.trim() !== '') {
                await new Promise((resolve) => setTimeout(resolve, IDE_LAUNCH_SETTLE_MS));
                return;
            }
        }
        catch {
            // Process not up yet; keep polling.
        }
        await new Promise((resolve) => setTimeout(resolve, IDE_LAUNCH_POLL_MS));
    }
}
/** Whether an editor name is one of the known canonical names. */
export function isKnownEditor(name) {
    return KNOWN_EDITORS.includes(name);
}
//# sourceMappingURL=actions.js.map