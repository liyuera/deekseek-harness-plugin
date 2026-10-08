/**
 * Browser-side mirror of the saved-prompt list. The host owns the records; this
 * store owns the derived lookup index both the strip and the trigger read, and
 * rebuilds it in the same step the list changes.
 */
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store';
import { normalizeText } from "./normalize.js";
import { promptTransport } from "./transport.js";
/**
 * Index the current list by normalized text. The oldest record wins, so a
 * duplicate keeps one stable identity across rebuilds.
 * @param items - current records.
 * @returns the lookup map.
 */
function indexByText(items) {
    const index = new Map();
    for (const record of [...items].sort((left, right) => left.createdAt - right.createdAt)) {
        const key = normalizeText(record.text);
        if (!index.has(key))
            index.set(key, record);
    }
    return index;
}
/**
 * Create the store and its actions.
 * @param transport - route transport; tests pass an in-memory double.
 * @returns the shared store handle.
 */
export function createFavoritesStore(transport = promptTransport) {
    const state = createSnapshotStore({ status: 'loading', items: [], byText: new Map() });
    const publish = (items) => {
        const sorted = [...items].sort((left, right) => right.createdAt - left.createdAt);
        state.set({ status: 'ready', items: sorted, byText: indexByText(sorted) });
    };
    const refresh = async () => {
        try {
            publish(await transport.list());
            return true;
        }
        catch (error) {
            state.set({
                status: 'error',
                items: [],
                byText: new Map(),
                error: error instanceof Error ? error.message : String(error),
            });
            return false;
        }
    };
    const mutate = async (operation) => {
        try {
            await operation();
        }
        catch {
            return false;
        }
        // A failed refresh after a successful write keeps the known list; the next
        // gesture retries.
        if (state.getSnapshot().status === 'ready')
            await refresh();
        return true;
    };
    return {
        state,
        actions: {
            refresh,
            add: (text, source) => mutate(() => transport.create(text, source)),
            update: (id, text) => mutate(() => transport.update(id, text)),
            remove: async (id) => {
                const record = state.getSnapshot().items.find(item => item.id === id) ?? null;
                if (record === null)
                    return null;
                return await mutate(() => transport.remove(id)) ? record : null;
            },
            restore: record => mutate(() => transport.restore(record)),
        },
    };
}
//# sourceMappingURL=store.js.map