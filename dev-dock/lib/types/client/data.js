/**
 * devDock browser data layer v2: mirrors the plugin's document from the host
 * through the same-origin `/dev-dock/state` route and exposes the
 * desktop-action bridge. Both are plain HTTP because static client bundles
 * have no package-private RPC channel (host.call is a dynamic-plugin
 * builtin); the host half owns the storage domain behind that route and runs
 * the deterministic desktop actions.
 * @module @liyuera/dsh-dev-dock/client/data
 */
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store';
/** Canonical editor names across platforms (union for stable UI display). */
export const EDITOR_NAMES = [
    'WebStorm', 'VS Code', 'IntelliJ IDEA', 'Cursor', 'Sublime Text', 'HBuilderX',
];
/**
 * Create the devDock data layer for one client plugin fiber.
 * @param ctx - client root context, used to own the mirror's effects.
 * @returns the document mirror and the action facade.
 */
export function createDevDockData(ctx) {
    const store = createSnapshotStore({ ready: false, settings: undefined });
    const adopt = (raw) => {
        const settings = decodeSettings(raw);
        if (settings === undefined)
            return;
        store.set({ ready: true, settings });
    };
    const refresh = async () => {
        try {
            const response = await fetch('/dev-dock/state', { method: 'GET' });
            const answer = await response.json();
            if (answer.ok === true)
                adopt(answer.settings);
        }
        catch {
            // The route is unreachable until the host half has booted; the next
            // gesture or focus event retries.
        }
    };
    void refresh();
    // Multi-tab consistency without a push channel: refetch when the page
    // regains focus.
    ctx.effect(() => {
        const onFocus = () => { void refresh(); };
        window.addEventListener('focus', onFocus);
        return () => { window.removeEventListener('focus', onFocus); };
    }, 'dev-dock: focus refresh');
    const write = async (field, value) => {
        // Reflect the gesture immediately, then let the host's answer (its own
        // validated document) replace the optimistic copy.
        const snapshot = store.getSnapshot().settings;
        if (snapshot !== undefined)
            store.set({ ready: true, settings: { ...snapshot, [field]: value } });
        try {
            const response = await fetch('/dev-dock/state', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ field, value }),
            });
            const answer = await response.json();
            if (answer.ok === true)
                adopt(answer.settings);
        }
        catch {
            // The optimistic copy stays visible; the next refresh reconciles.
        }
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