/**
 * chrome-browser plugin, browser half: registers the composer dock entry (a
 * full-width row above the input card) holding the tab selector. The
 * selector lists the user's real Chrome tabs, supports multi-select, and
 * keeps the whole selection host-side per session (reported to the model
 * through chrome_tabs' `session` field) — it never touches the input box or
 * any message content.
 * @module @liuyera/dsh-chrome-browser/client
 */
import { TabPicker } from "./TabPicker.js";
/** Required services for the slot contributions. */
export const inject = ['slots'];
/**
 * Client plugin body: register the composer dock tab selector.
 * @param ctx - client root context.
 */
export function apply(ctx) {
    ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
        name: 'conversation.input.dock',
        id: 'chrome-browser-tab-select',
        order: 5,
    }, TabPicker));
}
//# sourceMappingURL=index.js.map