/**
 * devDock plugin v2, browser half: registers the locale dictionary, the
 * sidebar footer start-work button, the three session-header action buttons
 * (IDE / terminal / start), the start-work dialog, and the devDock settings
 * page. All entries share one viewing store and the settings data mirror.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
import { type DevDockKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** devDock panel copy. */
        devDock: DevDockKey;
    }
}
export type { StartWorkButtonProps, StartWorkButtonInjected } from './StartWorkButton.tsx';
export type { StartWorkModalProps, StartWorkModalInjected } from './StartWorkModal.tsx';
export type { SessionActionButtonProps, SessionActionInjected } from './SessionActionButton.tsx';
export type { ComposerActionsProps, ComposerActionsInjected } from './ComposerActions.tsx';
export type { DevDockSettingsPageProps, DevDockSettingsInjected } from './DevDockSettingsPage.tsx';
export type { DevDockData, DevDockActions } from './data.ts';
/** Required services for data binding and slot contributions. */
export declare const inject: string[];
/**
 * Client plugin body: register dictionaries and every surface entry.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map