import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots';
import { NS } from './locales.ts';
import type { createSubagentSidebarStore } from './stores.ts';
/** Full props for the frame-wide running-count capsule. */
export type SubagentSidebarCapsuleProps = PropsRuntime<'shell.overlay'> & PropsStore<ReturnType<typeof createSubagentSidebarStore>> & PropsLocale<typeof NS>;
/**
 * Frame-wide running-count capsule: one entry in `shell.overlay` that shows
 * how many subagent sessions are running anywhere, and opens the overview
 * panel on click. Renders nothing when nothing runs, so an idle host keeps
 * the corner clean.
 * @param props - overlay runtime hooks, shared store, translator.
 * @returns the capsule button, or null when no subagent is running.
 */
export declare function SubagentSidebarCapsule({ useSessions, actions, t }: SubagentSidebarCapsuleProps): import("react").JSX.Element | null;
//# sourceMappingURL=SubagentSidebarCapsule.d.ts.map