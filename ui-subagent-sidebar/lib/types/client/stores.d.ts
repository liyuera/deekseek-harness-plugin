/**
 * Panel viewing store shared by the capsule and the panel: open state must
 * survive either entry's remount, and the expansion/filter state should
 * survive closing and reopening the panel. Module level exports the factory
 * only; apply() instantiates one handle and passes it to both registrations.
 *
 * Collapse sets are plain arrays: the immer-backed store engine has no
 * MapSet plugin, so mutable Set state is not draft-safe.
 */
import { type EngineStoreHandle, type SessionId } from '@deepseek-ai/dsh-client-runtime/client';
/** Panel viewing state. */
export type SubagentSidebarState = {
    /** Whether the overview panel is open. */
    open: boolean;
    /** Root-session groups collapsed by root session id. */
    collapsedRoots: readonly SessionId[];
    /** Subagent rows collapsed by their own session id. */
    collapsedNodes: readonly SessionId[];
    /** Running-only filter. */
    onlyRunning: boolean;
};
/** Annotation twin of the actions literal (see defineStore contract). */
export type SubagentSidebarActions = {
    setOpen: (draft: SubagentSidebarState, open: boolean) => void;
    toggleRoot: (draft: SubagentSidebarState, rootId: SessionId) => void;
    toggleNode: (draft: SubagentSidebarState, nodeId: SessionId) => void;
    setOnlyRunning: (draft: SubagentSidebarState, onlyRunning: boolean) => void;
};
/**
 * Create the subagent overview store handle.
 * @returns the store handle (spec + type + identity + factory in one).
 */
export declare function createSubagentSidebarStore(): EngineStoreHandle<SubagentSidebarState, SubagentSidebarActions>;
//# sourceMappingURL=stores.d.ts.map