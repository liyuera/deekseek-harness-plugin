/**
 * devDock projects page: the registered project list with per-project
 * actions (open in terminal / IDE via the agent, remove from registry).
 */
import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { DevDockActions, DevDockData } from '../api.ts';
import { NS } from '../locales.ts';
import type { DevDockPage } from '../stores.ts';
/** Registration-side inject face (same shape as the drawer's). */
export interface ProjectListInjected {
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
export type ProjectListPageProps = PropsLocale<typeof NS> & InjectFace<ProjectListInjected> & {
    /** Navigate to another drawer page. */
    onNavigate: (page: DevDockPage) => void;
};
/**
 * Render the projects page.
 * @param props - data hook, actions, navigator, translator.
 * @returns the project list.
 */
export declare function ProjectListPage({ useDevDockData, actions, promptAgent, onNavigate, t }: ProjectListPageProps): import("react").JSX.Element;
//# sourceMappingURL=ProjectListPage.d.ts.map