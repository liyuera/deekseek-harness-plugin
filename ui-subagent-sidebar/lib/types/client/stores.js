/**
 * Panel viewing store shared by the capsule and the panel: open state must
 * survive either entry's remount, and the expansion/filter state should
 * survive closing and reopening the panel. Module level exports the factory
 * only; apply() instantiates one handle and passes it to both registrations.
 *
 * Collapse sets are plain arrays: the immer-backed store engine has no
 * MapSet plugin, so mutable Set state is not draft-safe.
 */
import { defineStore } from '@deepseek-ai/dsh-client-runtime/client';
/** Toggle one id in a collapse array. */
function toggle(list, id) {
    return list.includes(id)
        ? list.filter(candidate => candidate !== id)
        : [...list, id];
}
/**
 * Create the subagent overview store handle.
 * @returns the store handle (spec + type + identity + factory in one).
 */
export function createSubagentSidebarStore() {
    return defineStore({
        init: () => ({
            open: false,
            collapsedRoots: [],
            collapsedNodes: [],
            onlyRunning: false,
        }),
        actions: {
            setOpen: (draft, open) => { draft.open = open; },
            toggleRoot: (draft, rootId) => { draft.collapsedRoots = toggle(draft.collapsedRoots, rootId); },
            toggleNode: (draft, nodeId) => { draft.collapsedNodes = toggle(draft.collapsedNodes, nodeId); },
            setOnlyRunning: (draft, onlyRunning) => { draft.onlyRunning = onlyRunning; },
        },
    });
}
//# sourceMappingURL=stores.js.map