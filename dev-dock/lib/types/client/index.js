import { createDevDockData } from "./api.js";
import { createDevDockStore } from "./stores.js";
import { DevDockEntry } from "./DevDockEntry.js";
import { DevDockDrawer } from "./DevDockDrawer.js";
import { en, NS, zh } from "./locales.js";
/** Required services for data binding and slot contributions. */
export const inject = ['slots', 'locale', 'settingsScope', 'sessions'];
/**
 * Client plugin body: register dictionaries and both surface entries.
 * @param ctx - client root context.
 */
export function apply(ctx) {
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dev-dock: dictionaries');
    const view = createDevDockStore();
    const { store: dataStore, actions: dataActions } = createDevDockData(ctx);
    const entryInjected = () => ({
        hooks: { devDockData: dataStore },
    });
    const drawerInjected = () => ({
        hooks: { devDockData: dataStore },
        actions: dataActions,
        promptAgent: (text) => dataActions.promptAgent(text),
    });
    ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
        name: 'sidebar.footer.action',
        id: 'dev-dock',
        order: 10,
        locale: NS,
        store: view,
        inject: entryInjected,
    }, DevDockEntry));
    ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay',
        id: 'dev-dock-drawer',
        order: 100,
        locale: NS,
        store: view,
        inject: drawerInjected,
    }, DevDockDrawer));
}
//# sourceMappingURL=index.js.map