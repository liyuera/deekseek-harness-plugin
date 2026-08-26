import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { DevDockActions, DevDockData } from './data.ts';
import { NS } from './locales.ts';
/** Which desktop action one header button performs. */
export type SessionActionKind = 'ide' | 'terminal' | 'start';
/** Registration-side inject face for one header action button. */
export interface SessionActionInjected {
    /** Which action this button performs. */
    action: SessionActionKind;
    /** Data mutation and desktop actions. */
    dataActions: DevDockActions;
    hooks: {
        /** Settings snapshot bound by the renderer as useDevDockData. */
        devDockData: {
            getSnapshot(): DevDockData;
            subscribe(fn: () => void): () => void;
        };
    };
}
/** Full component props for one header action button. */
export type SessionActionButtonProps = PropsRuntime<'conversation.session.header.actions'> & PropsLocale<typeof NS> & InjectFace<SessionActionInjected>;
/**
 * One session-header action button.
 * @param props - header action runtime, inject face, translator.
 * @returns the icon button, or null when the session has no workspace.
 */
export declare function SessionActionButton({ sessionId, useWorkspaces, useDevDockData, action, dataActions, t }: SessionActionButtonProps): import("react").JSX.Element | null;
//# sourceMappingURL=SessionActionButton.d.ts.map