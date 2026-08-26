/**
 * Sidebar footer start-work button: the "开始上班" row that opens the
 * workspace-selection dialog. Follows the sidebar footer action style —
 * ghost row, icon + label on the wide sidebar, icon-only on the 56px rail.
 */
import type { InjectFace, PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots';
import type { DevDockData } from './data.ts';
import { NS } from './locales.ts';
import type { createDevDockStore } from './stores.ts';
/** Registration-side inject face: the settings mirror bound as useDevDockData. */
export interface StartWorkButtonInjected {
    hooks: {
        /** Settings snapshot bound by the renderer as useDevDockData. */
        devDockData: {
            getSnapshot(): DevDockData;
            subscribe(fn: () => void): () => void;
        };
    };
}
/** Full component props for the start-work footer button. */
export type StartWorkButtonProps = PropsRuntime<'sidebar.footer.action'> & PropsStore<ReturnType<typeof createDevDockStore>> & PropsLocale<typeof NS> & InjectFace<StartWorkButtonInjected>;
/**
 * The sidebar footer start-work button.
 * @param props - footer owner state, view store, settings mirror, translator.
 * @returns the button row.
 */
export declare function StartWorkButton({ wide, useWorkspaces, useDevDockData, actions, t }: StartWorkButtonProps): import("react").JSX.Element;
//# sourceMappingURL=StartWorkButton.d.ts.map