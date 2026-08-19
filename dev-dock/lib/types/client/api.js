/**
 * devDock browser data layer: binds the plugin's settings namespace through
 * the settingsScope service and exposes a snapshot store plus mutation
 * actions to the UI. Agent-facing actions (open IDE / terminal / quick-start)
 * are routed through the current session's prompt so the approval pipeline
 * and tool cards apply.
 * @module @liyuera/dsh-dev-dock/client/api
 */
import { createSnapshotStore } from '@deepseek-ai/dsh-client-runtime/client';
/**
 * Create the devDock data layer for one client plugin fiber.
 * @param ctx - client root context (needs settingsScope, remote, connection).
 * @returns the data store and action facade.
 */
export function createDevDockData(ctx) {
    const scope = ctx.settingsScope.bind({
        namespace: 'dev-dock',
        decode: decodeSettings,
    });
    const store = createSnapshotStore({ ready: false, settings: undefined });
    // Mirror the settings scope snapshot into the store.
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
        async saveProject(project) {
            const current = store.getSnapshot().settings;
            if (current === undefined)
                return;
            const projects = upsertLocal(current.projects, project);
            await write('projects', projects);
        },
        async removeProject(projectId) {
            const current = store.getSnapshot().settings;
            if (current === undefined)
                return;
            const projects = current.projects.filter((p) => p.id !== projectId);
            const quickStarts = current.quickStarts
                .map((plan) => ({
                ...plan,
                items: plan.items.filter((item) => item.projectId !== projectId),
            }))
                .filter((plan) => plan.items.length > 0);
            await write('projects', projects);
            await write('quickStarts', quickStarts);
        },
        async setEditors(editors) {
            await write('editors', editors);
        },
        async setQuickStarts(plans) {
            await write('quickStarts', plans);
        },
        async setQuickStartPlan(plan) {
            const current = store.getSnapshot().settings;
            if (current === undefined)
                return;
            const existing = current.quickStarts.find((p) => p.name === plan.name);
            const quickStarts = existing
                ? current.quickStarts.map((p) => (p.name === plan.name ? plan : p))
                : [...current.quickStarts, plan];
            await write('quickStarts', quickStarts);
        },
        async promptAgent(text) {
            return promptCurrentSession(ctx, text);
        },
    };
    return { store, actions };
}
/** Decode the wire section into the settings document (lenient cast). */
function decodeSettings(section) {
    if (section === null || typeof section !== 'object')
        return undefined;
    const doc = section;
    if (!Array.isArray(doc.projects) || !Array.isArray(doc.editors) || !Array.isArray(doc.quickStarts)) {
        return undefined;
    }
    return {
        projects: doc.projects,
        editors: doc.editors,
        quickStarts: doc.quickStarts,
        terminalApp: doc.terminalApp === 'iterm' ? 'iterm' : 'default',
    };
}
/** Local upsert mirroring the host-side semantics (path is the unique key). */
function upsertLocal(projects, project) {
    const existing = projects.find((p) => p.path === project.path);
    const stored = {
        ...project,
        id: existing?.id ?? String(Math.max(0, ...projects.map((p) => Number(p.id) || 0)) + 1),
        createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    return existing
        ? projects.map((p) => (p.path === project.path ? stored : p))
        : [...projects, stored];
}
/**
 * Queue a user action through the current session's prompt so the agent
 * executes the matching dev-dock tool under the approval pipeline. Sends
 * through the ui-conversation service on the current session's scope.
 * @param ctx - client root context.
 * @param text - instruction text for the agent.
 * @returns true when a session accepted the prompt.
 */
async function promptCurrentSession(ctx, text) {
    const sessions = ctx.sessions;
    const current = sessions.list.getSnapshot().current;
    if (current === undefined)
        return false;
    const scoped = sessions.scope(current);
    if (scoped === undefined)
        return false;
    const conversation = scoped.conversation;
    if (conversation === undefined)
        return false;
    try {
        await conversation.send(text);
        return true;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=api.js.map