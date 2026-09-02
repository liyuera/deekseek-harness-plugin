import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots';
import { NS } from './locales.ts';
import type { createSubagentSidebarStore } from './stores.ts';
/** Business actions supplied by the slot registration. */
export interface SubagentSidebarPanelInjected {
    openChild: (parentSessionId: SessionId, childSessionId: SessionId, mode: 'one-shot' | 'continuable') => void;
    refresh: (parentSessionId: SessionId) => void;
    setCatalogOpen: (parentSessionId: SessionId, open: boolean) => void;
}
/** Full props for the frame-wide overview panel. */
export type SubagentSidebarPanelProps = PropsRuntime<'shell.overlay'> & PropsStore<ReturnType<typeof createSubagentSidebarStore>> & SubagentSidebarPanelInjected & PropsLocale<typeof NS>;
/**
 * Frame-wide subagent overview panel: every root session's direct subagent
 * catalog, grouped under collapsible root headers that are independent of
 * each other. Rows follow the official catalog layout — state dot, label,
 * `title · mode · activity` secondary line, token/duration metrics — and
 * branches expand lazily through the catalog mirror like the shipped header
 * action. Opening the panel subscribes every root's catalog; closing
 * unsubscribes all of them.
 * @param props - overlay runtime hooks, store share, catalog actions, translator.
 * @returns the panel, or null while closed.
 */
export declare function SubagentSidebarPanel({ useSessions, useWorkspaces, useStore, actions, openChild, refresh, setCatalogOpen, t, }: SubagentSidebarPanelProps): import("react").JSX.Element | null;
//# sourceMappingURL=SubagentSidebarPanel.d.ts.map