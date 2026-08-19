import type { InjectFace, PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots';
import type { DevDockActions, DevDockData } from './api.ts';
import { NS } from './locales.ts';
import type { createDevDockStore } from './stores.ts';
/** Registration-side inject face for the drawer. */
export interface DevDockDrawerInjected {
    hooks: {
        /** Settings snapshot bound by the renderer as useDevDockData. */
        devDockData: {
            getSnapshot(): DevDockData;
            subscribe(fn: () => void): () => void;
        };
    };
    /** Data mutation actions. */
    actions: DevDockActions;
    /** Prompt the current session to run a dev-dock action tool. */
    promptAgent: (text: string) => Promise<boolean>;
}
/** Full component props for the drawer. */
export type DevDockDrawerProps = PropsRuntime<'shell.overlay'> & PropsStore<ReturnType<typeof createDevDockStore>> & PropsLocale<typeof NS> & InjectFace<DevDockDrawerInjected>;
/**
 * The devDock overlay drawer.
 * @param props - overlay runtime, view store, data hook, actions, translator.
 * @returns the drawer panel, or null when closed.
 */
export declare function DevDockDrawer({ useStore, actions: view, useDevDockData, actions, promptAgent, t }: DevDockDrawerProps): import("react").JSX.Element | null;
//# sourceMappingURL=DevDockDrawer.d.ts.map