/**
 * devDock plugin, browser half: registers the locale dictionary and the two
 * surface entries — the sidebar footer action row (opens the drawer) and the
 * shell.overlay drawer panel. Both entries share one viewing store and the
 * settings data mirror.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
import { type DevDockKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** devDock panel copy. */
        devDock: DevDockKey;
    }
}
export type { DevDockEntryProps, DevDockEntryInjected } from './DevDockEntry.tsx';
export type { DevDockDrawerProps, DevDockDrawerInjected } from './DevDockDrawer.tsx';
export type { DevDockData, DevDockActions } from './api.ts';
/** Required services for data binding and slot contributions. */
export declare const inject: string[];
/**
 * Client plugin body: register dictionaries and both surface entries.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map