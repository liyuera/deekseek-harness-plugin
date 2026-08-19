import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { DevDockActions, DevDockData } from '../api.ts';
import { NS } from '../locales.ts';
/** Registration-side inject face (same shape as the drawer's). */
export interface QuickStartInjected {
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
/** Full component props. */
export type QuickStartPageProps = PropsLocale<typeof NS> & InjectFace<QuickStartInjected>;
/**
 * Render the quick-start page.
 * @param props - view store, data hook, actions, translator.
 * @returns the quick-start editor.
 */
export declare function QuickStartPage({ useDevDockData, actions, promptAgent, t }: QuickStartPageProps): import("react").JSX.Element;
//# sourceMappingURL=QuickStartPage.d.ts.map