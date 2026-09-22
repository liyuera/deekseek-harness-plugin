/**
 * chrome-browser plugin, browser half: registers the composer dock entry (a
 * full-width row above the input card) holding the tab selector. The
 * selector lists the user's real Chrome tabs, supports multi-select, and
 * keeps the whole selection host-side per session (reported to the model
 * through chrome_tabs' `session` field) — it never touches the input box or
 * any message content.
 * @module @liuyera/dsh-chrome-browser/client
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
export type { TabPickerProps } from './TabPicker.tsx';
/** Required services for the slot contributions. */
export declare const inject: string[];
/**
 * Client plugin body: register the composer dock tab selector.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map