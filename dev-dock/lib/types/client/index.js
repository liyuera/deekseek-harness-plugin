import { createDevDockData } from "./data.js";
import { createDevDockStore } from "./stores.js";
import { StartWorkButton } from "./StartWorkButton.js";
import { StartWorkModal } from "./StartWorkModal.js";
import { SessionActionButton } from "./SessionActionButton.js";
import { ComposerActions } from "./ComposerActions.js";
import { DevDockSettingsPage } from "./DevDockSettingsPage.js";
import { en, NS, zh } from "./locales.js";
/** Required services for data binding and slot contributions. */
export const inject = ['slots', 'locale', 'settingsScope'];
/**
 * Client plugin body: register dictionaries and every surface entry.
 * @param ctx - client root context.
 */
export function apply(ctx) {
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dev-dock: dictionaries');
    const t = ctx.locale.bind(NS);
    const view = createDevDockStore();
    const data = createDevDockData(ctx);
    const dataHandle = data.store;
    const dataActions = data.actions;
    const modalInjected = () => ({
        hooks: { devDockData: dataHandle },
        dataActions,
    });
    // Sidebar foot: the start-work button above Settings.
    const footerInjected = () => ({
        hooks: { devDockData: dataHandle },
    });
    ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
        name: 'sidebar.footer.action',
        id: 'dev-dock-start',
        order: 5,
        locale: NS,
        store: view,
        inject: footerInjected,
    }, StartWorkButton));
    // Session header: IDE / terminal / start for the current session's workspace.
    const headerInjected = (action) => () => ({
        action,
        dataActions,
        hooks: { devDockData: dataHandle },
    });
    ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
        name: 'conversation.session.header.actions',
        id: 'dev-dock-ide',
        order: 30,
        locale: NS,
        inject: headerInjected('ide'),
    }, SessionActionButton));
    ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
        name: 'conversation.session.header.actions',
        id: 'dev-dock-terminal',
        order: 31,
        locale: NS,
        inject: headerInjected('terminal'),
    }, SessionActionButton));
    ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
        name: 'conversation.session.header.actions',
        id: 'dev-dock-start',
        order: 32,
        locale: NS,
        inject: headerInjected('start'),
    }, SessionActionButton));
    // Composer tool row, right seat: the three actions before the send button
    // (works for brand-new sessions with no history, the pain point the header
    // buttons cannot cover).
    const composerInjected = () => ({
        dataActions,
        hooks: { devDockData: dataHandle },
    });
    ctx.slots.inject('conversation.input.right', () => ctx.slots.register({
        name: 'conversation.input.right',
        id: 'dev-dock-actions',
        order: 10,
        locale: NS,
        inject: composerInjected,
    }, ComposerActions));
    // Start-work dialog on the frame-wide overlay.
    ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay',
        id: 'dev-dock-start-modal',
        order: 300,
        locale: NS,
        store: view,
        inject: modalInjected,
    }, StartWorkModal));
    // Settings page: devDock preferences.
    const settingsInjected = () => ({
        hooks: { devDockData: dataHandle },
        dataActions,
    });
    ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'dev-dock',
        order: 12,
        label: () => t('settings.title'),
        locale: NS,
        inject: settingsInjected,
    }, DevDockSettingsPage));
}
//# sourceMappingURL=index.js.map