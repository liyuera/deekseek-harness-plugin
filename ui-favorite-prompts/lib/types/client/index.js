import { FavoritesSettingsPage } from "./settings/FavoritesSettingsPage.js";
import { FavoriteStrip } from "./strip/FavoriteStrip.js";
import { favoriteStripDefinition, FAVORITE_STRIP_KIND } from "./strip/definition.js";
import { createFavoritesSource } from "./trigger/source.js";
import { createFavoritesStore } from "./store.js";
import { en, NS, zh } from "./locales.js";
/** Services the browser half reads; the fiber waits for all four. */
export const inject = ['slots', 'locale', 'uiConversation', 'inputTriggers'];
/**
 * Wire the store and the three contributions.
 * @param ctx - browser context carrying the slot registry and the two registries.
 */
export function apply(ctx) {
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'favorite-prompts: dictionaries');
    const t = ctx.locale.bind(NS);
    const favorites = createFavoritesStore();
    void favorites.actions.refresh();
    // Multi-tab consistency without a push channel: refetch when the page regains
    // focus.
    ctx.effect(() => {
        const onFocus = () => { void favorites.actions.refresh(); };
        window.addEventListener('focus', onFocus);
        return () => { window.removeEventListener('focus', onFocus); };
    }, 'favorite-prompts: focus refresh');
    // 1. Bookmark strip under every user message. The registry ties a Definition
    // to its own context, not to this fiber, so the contribution rides an effect
    // to stay HMR-safe (a lingering Definition would also collide on re-apply).
    ctx.effect(() => ctx.uiConversation.events.register(favoriteStripDefinition), 'favorite-prompts: strip definition');
    ctx.slots.inject('conversation.chat.node', () => ctx.slots.register({
        name: 'conversation.chat.node',
        key: FAVORITE_STRIP_KIND,
        locale: NS,
        inject: () => ({ hooks: { favorites: favorites.state }, actions: favorites.actions }),
    }, FavoriteStrip));
    // 2. `@` group listing saved prompts.
    const inputTriggers = ctx.get('inputTriggers');
    ctx.effect(() => inputTriggers.registerSource(createFavoritesSource(() => favorites.state.getSnapshot(), t)), 'favorite-prompts: @ source');
    // 3. Settings page.
    ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'favorite-prompts',
        order: 30,
        label: () => t('nav'),
        locale: NS,
        inject: () => ({ hooks: { favorites: favorites.state }, actions: favorites.actions }),
    }, FavoritesSettingsPage));
}
//# sourceMappingURL=index.js.map