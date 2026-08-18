import { SubagentSidebarCapsule } from "./SubagentSidebarCapsule.js";
import { SubagentSidebarPanel } from "./SubagentSidebarPanel.js";
import { createSubagentSidebarStore } from "./stores.js";
import { en, NS, zh } from "./locales.js";
/** Required services for catalog refresh and slot contributions. */
export const inject = ['sessions', 'slots', 'locale'];
/**
 * Client plugin body: register the dictionaries and both overlay entries.
 * @param ctx - client root context.
 */
export function apply(ctx) {
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-subagent-sidebar: dictionaries');
    const sessions = ctx.sessions;
    // One shared handle: the capsule opens the panel, the panel reports its
    // own close, and both survive remounts through the same store.
    const store = createSubagentSidebarStore();
    const panelInjected = () => ({
        openChild(parentSessionId, childSessionId, mode) {
            sessions.openSubagent({ parentSessionId, childSessionId, mode });
        },
        refresh(parentSessionId) {
            void sessions.refreshSubagents(parentSessionId);
        },
        setCatalogOpen(parentSessionId, open) {
            sessions.setSubagentCatalogOpen(parentSessionId, open);
        },
    });
    ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay',
        id: 'subagent-sidebar-capsule',
        order: 50,
        locale: NS,
        store,
    }, SubagentSidebarCapsule));
    ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay',
        id: 'subagent-sidebar-panel',
        order: 100,
        locale: NS,
        store,
        inject: panelInjected,
    }, SubagentSidebarPanel));
}
//# sourceMappingURL=index.js.map