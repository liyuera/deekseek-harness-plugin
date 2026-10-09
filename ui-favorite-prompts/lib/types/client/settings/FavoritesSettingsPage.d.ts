/** Settings page managing the saved-prompt list. */
import { type ReactNode } from 'react';
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store';
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { FavoritesActions, FavoritesState } from '../store.ts';
import { NS } from '../locales.ts';
/** Business face injected into the settings registration. */
export interface FavoritesSettingsInjected {
    hooks: {
        favorites: SnapshotStore<FavoritesState>;
    };
    actions: FavoritesActions;
}
/** Composed props of the settings page. */
export type FavoritesSettingsProps = PropsRuntime<'settings.section'> & PropsLocale<typeof NS> & InjectFace<FavoritesSettingsInjected>;
/**
 * Render the management page: edit, delete, and add saved prompts.
 * @param props - favorites hook and actions, plus the locale seat.
 * @returns the page body.
 */
export declare function FavoritesSettingsPage({ useFavorites, actions, t }: FavoritesSettingsProps): ReactNode;
//# sourceMappingURL=FavoritesSettingsPage.d.ts.map