import type { InjectFace, PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots';
import type { DevDockActions, DevDockData } from './data.ts';
import { NS } from './locales.ts';
import type { createDevDockStore } from './stores.ts';
/** Registration-side inject face for the dialog. */
export interface StartWorkModalInjected {
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
/** Full component props for the start-work dialog. */
export type StartWorkModalProps = PropsRuntime<'shell.overlay'> & PropsStore<ReturnType<typeof createDevDockStore>> & PropsLocale<typeof NS> & InjectFace<StartWorkModalInjected>;
/**
 * The start-work dialog.
 * @param props - overlay runtime, view store, data hook, actions, translator.
 * @returns the modal, or null when closed.
 */
export declare function StartWorkModal({ useStore, actions, useWorkspaces, useDevDockData, dataActions, t }: StartWorkModalProps): import("react").JSX.Element | null;
//# sourceMappingURL=StartWorkModal.d.ts.map