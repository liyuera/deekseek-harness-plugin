/**
 * devDock panel viewing store: drawer open state, active page, and the
 * selected project must survive entry/drawer remounts, so they live in one
 * store handle shared by the sidebar entry and the overlay drawer.
 * @module @liyuera/dsh-dev-dock/client/stores
 */
import { defineStore } from '@deepseek-ai/dsh-client-runtime/client';
/**
 * Create the devDock panel viewing store.
 * @returns the store handle (spec + type + identity + factory in one).
 */
export function createDevDockStore() {
    return defineStore({
        init: () => ({
            open: false,
            page: 'projects',
            selectedProjectId: undefined,
        }),
        actions: {
            setOpen: (draft, open) => { draft.open = open; },
            setPage: (draft, page) => { draft.page = page; },
            setSelectedProject: (draft, projectId) => { draft.selectedProjectId = projectId; },
        },
    });
}
//# sourceMappingURL=stores.js.map