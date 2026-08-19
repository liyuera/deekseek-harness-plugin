/**
 * Sidebar footer entry: a full-width row above Settings showing the devDock
 * title and the registered project count; clicking opens the drawer. Renders
 * a compact icon on the 56px rail.
 */
import type { InjectFace, PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots';
import type { DevDockData } from './api.ts';
import { NS } from './locales.ts';
import type { createDevDockStore } from './stores.ts';
/** Registration-side inject face: the settings mirror bound as useDevDockData. */
export interface DevDockEntryInjected {
    hooks: {
        /** Settings snapshot bound by the renderer as useDevDockData. */
        devDockData: {
            getSnapshot(): DevDockData;
            subscribe(fn: () => void): () => void;
        };
    };
}
/** Full component props for the footer entry. */
export type DevDockEntryProps = PropsRuntime<'sidebar.footer.action'> & PropsStore<ReturnType<typeof createDevDockStore>> & PropsLocale<typeof NS> & InjectFace<DevDockEntryInjected>;
/**
 * The sidebar footer entry row.
 * @param props - footer owner state, view store, data hook, translator.
 * @returns the entry button.
 */
export declare function DevDockEntry({ wide, actions, useDevDockData, t }: DevDockEntryProps): import("react").JSX.Element;
//# sourceMappingURL=DevDockEntry.d.ts.map