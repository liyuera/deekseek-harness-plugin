import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import { type DevDockActions, type DevDockData } from './data.ts';
import { NS } from './locales.ts';
/** Registration-side inject face for the settings page. */
export interface DevDockSettingsInjected {
    hooks: {
        /** Settings snapshot bound by the renderer as useDevDockData. */
        devDockData: {
            getSnapshot(): DevDockData;
            subscribe(fn: () => void): () => void;
        };
    };
    /** Data mutation and desktop actions. */
    dataActions: DevDockActions;
}
/** Full component props for the settings page. */
export type DevDockSettingsPageProps = PropsRuntime<'settings.section'> & PropsLocale<typeof NS> & InjectFace<DevDockSettingsInjected>;
/**
 * Render the devDock settings page.
 * @param props - settings runtime, data hook, actions, translator.
 * @returns the settings sections.
 */
export declare function DevDockSettingsPage({ useWorkspaces, useDevDockData, dataActions, t }: DevDockSettingsPageProps): import("react").JSX.Element;
//# sourceMappingURL=DevDockSettingsPage.d.ts.map