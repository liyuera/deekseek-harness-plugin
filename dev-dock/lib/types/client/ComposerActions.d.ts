import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { DevDockActions, DevDockData } from './data.ts';
import { NS } from './locales.ts';
/** Registration-side inject face for the composer action group. */
export interface ComposerActionsInjected {
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
/** Full component props for the composer action group (left/right seats
 * carry the same InputZone standard props, so both registrations accept it). */
export type ComposerActionsProps = PropsRuntime<'conversation.input.left'> & PropsRuntime<'conversation.input.right'> & PropsLocale<typeof NS> & InjectFace<ComposerActionsInjected>;
/**
 * The composer tool-row action group.
 * @param props - input-zone runtime, settings mirror, actions, translator.
 * @returns the three buttons, or null when the session has no workspace.
 */
export declare function ComposerActions({ sessionId, useWorkspaces, useDevDockData, dataActions, t }: ComposerActionsProps): import("react").JSX.Element | null;
//# sourceMappingURL=ComposerActions.d.ts.map