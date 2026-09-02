/**
 * devDock browser data layer v2: mirrors the plugin's settings namespace
 * through settingsScope and exposes the desktop-action bridge. The bridge is
 * a same-origin POST to the plugin's host route (`/dev-dock/action`) because
 * static client bundles have no package-private RPC channel (host.call is a
 * dynamic-plugin builtin); the web server route is registered by the host
 * half and runs deterministic desktop actions.
 * @module @liyuera/dsh-dev-dock/client/data
 */
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store';
/** Canonical editor names across platforms (union for stable UI display). */
export const EDITOR_NAMES = [
    'WebStorm', 'VS Code', 'IntelliJ IDEA', 'Cursor', 'Sublime Text', 'HBuilderX',
];
/**
 * Create the devDock data layer for one client plugin fiber.
 * @param ctx - client root context (needs settingsScope).
 * @returns the settings mirror and the action facade.
 */
export function createDevDockData(ctx) {
    const scope = ctx.settingsScope.bind({
        namespace: 'dev-dock',
        decode: decodeSettings,
    });
    const store = createSnapshotStore({ ready: false, settings: undefined });
    const reflect = () => {
        const snapshot = scope.getSnapshot();
        store.set({
            ready: snapshot.status === 'ready',
            settings: snapshot.value,
        });
    };
    reflect();
    const unsubscribe = scope.subscribe(reflect);
    ctx.effect(() => unsubscribe, 'dev-dock: settings mirror');
    const write = async (field, value) => {
        await scope.set(field, value);
    };
    const actions = {
        async setWorkspacePref(workspaceId, editor) {
            const current = store.getSnapshot().settings;
            if (current === undefined)
                return;
            const rest = current.workspacePrefs.filter((p) => p.workspaceId !== workspaceId);
            // Empty editor resets the preference (auto-detection default applies).
            const next = editor === '' ? rest : [...rest, { workspaceId, editor }];
            await write('workspacePrefs', next);
        },
        async setEditorManualPath(name, manualPath) {
            const current = store.getSnapshot().settings;
            if (current === undefined)
                return;
            const existing = current.editors.find((e) => e.name === name);
            const next = existing === undefined
                ? [...current.editors, { name, manualPath }]
                : current.editors.map((e) => (e.name === name ? { ...e, manualPath } : e));
            await write('editors', next);
        },
        async setTerminalApp(app) {
            await write('terminalApp', app);
        },
        async setStartWork(workspaceIds) {
            await write('startWork', workspaceIds);
        },
        listEditors: () => rpcAction('list-editors'),
        openIde: (workspaceId) => rpcAction('open-ide', { workspaceId }),
        openTerminal: (workspaceId) => rpcAction('open-terminal', { workspaceId }),
        start: (workspaceId) => rpcAction('start', { workspaceId }),
        startWork: (workspaceIds) => rpcAction('start-work', { workspaceIds }),
    };
    return { store, actions };
}
/** Decode the wire section into the settings document (lenient cast). */
function decodeSettings(section) {
    if (section === null || typeof section !== 'object')
        return undefined;
    const doc = section;
    if (!Array.isArray(doc.workspacePrefs) || !Array.isArray(doc.editors) || !Array.isArray(doc.startWork)) {
        return undefined;
    }
    return {
        workspacePrefs: doc.workspacePrefs,
        editors: doc.editors,
        terminalApp: doc.terminalApp === 'iterm' ? 'iterm' : 'default',
        startWork: doc.startWork,
    };
}
/**
 * POST one action to the plugin's host route.
 * @param action - action name.
 * @param extra - additional JSON fields.
 * @returns the host answer, or a fetch-failure answer when the wire failed.
 */
async function rpcAction(action, extra = {}) {
    try {
        const response = await fetch('/dev-dock/action', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ action, ...extra }),
        });
        const raw = await response.json();
        return raw;
    }
    catch (error) {
        return { ok: false, error: `devDock action route unreachable: ${error instanceof Error ? error.message : String(error)}` };
    }
}
//# sourceMappingURL=data.js.map