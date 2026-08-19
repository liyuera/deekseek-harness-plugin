import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { DevDockData } from '../api.ts';
import { NS } from '../locales.ts';
/** Registration-side inject face (same shape as the drawer's). */
export interface ImportInjected {
    hooks: {
        /** Settings snapshot bound by the renderer as useDevDockData. */
        devDockData: {
            getSnapshot(): DevDockData;
            subscribe(fn: () => void): () => void;
        };
    };
    /** Prompt the current session to run a dev-dock action tool. */
    promptAgent: (text: string) => Promise<boolean>;
    /** Open the host's native single-directory chooser; null when cancelled. */
    pickDirectory: () => Promise<string | null>;
}
/** Full component props. */
export type ImportPageProps = PropsLocale<typeof NS> & InjectFace<ImportInjected>;
/**
 * Render the import page.
 * @param props - prompt channel, directory picker, translator.
 * @returns the import form.
 */
export declare function ImportPage({ promptAgent, pickDirectory, t }: ImportPageProps): import("react").JSX.Element;
//# sourceMappingURL=ImportPage.d.ts.map