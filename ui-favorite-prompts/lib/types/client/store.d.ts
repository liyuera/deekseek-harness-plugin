/**
 * Browser-side mirror of the saved-prompt list. The host owns the records; this
 * store owns the derived lookup index both the strip and the trigger read, and
 * rebuilds it in the same step the list changes.
 */
import { type SnapshotStore } from '@deepseek-ai/dsh-client-store';
import type { PromptRecord, PromptSourceRef } from '../schema.ts';
import { type PromptTransport } from './transport.ts';
/** Observable state of the saved-prompt list. */
export interface FavoritesState {
    /** `loading` until the first answer; `error` when the route is unreachable. */
    readonly status: 'loading' | 'ready' | 'error';
    readonly items: readonly PromptRecord[];
    /** Normalized text to record; the only membership test the UI performs. */
    readonly byText: ReadonlyMap<string, PromptRecord>;
    readonly error?: string;
}
/** The complete write set of the store. */
export interface FavoritesActions {
    refresh(): Promise<boolean>;
    add(text: string, source?: PromptSourceRef): Promise<boolean>;
    update(id: string, text: string): Promise<boolean>;
    remove(id: string): Promise<PromptRecord | null>;
    restore(record: PromptRecord): Promise<boolean>;
}
/** One store handle shared by the strip, the trigger source, and the settings page. */
export interface FavoritesStore {
    readonly state: SnapshotStore<FavoritesState>;
    readonly actions: FavoritesActions;
}
/**
 * Create the store and its actions.
 * @param transport - route transport; tests pass an in-memory double.
 * @returns the shared store handle.
 */
export declare function createFavoritesStore(transport?: PromptTransport): FavoritesStore;
//# sourceMappingURL=store.d.ts.map