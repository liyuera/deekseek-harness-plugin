/**
 * devDock panel viewing store: the start-work dialog open state. Shared by
 * the sidebar footer button and entry row so the dialog opens from either
 * and survives entry/overlay remounts.
 * @module @liyuera/dsh-dev-dock/client/stores
 */
import { defineStore } from '@deepseek-ai/dsh-client-store';
/**
 * Create the devDock viewing store.
 * @returns the store handle (spec + type + identity + factory in one).
 */
export function createDevDockStore() {
    return defineStore({
        init: () => ({ open: false }),
        actions: {
            setOpen: (draft, open) => { draft.open = open; },
        },
    });
}
//# sourceMappingURL=stores.js.map