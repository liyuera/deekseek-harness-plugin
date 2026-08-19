/**
 * devDock browser data layer: binds the plugin's settings namespace through
 * the settingsScope service and exposes a snapshot store plus mutation
 * actions to the UI. Agent-facing actions (open IDE / terminal / quick-start)
 * are routed through the current session's prompt so the approval pipeline
 * and tool cards apply.
 * @module @liyuera/dsh-dev-dock/client/api
 */
import { type SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client';
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
import type { SettingsScope } from '@deepseek-ai/dsh-client-runtime/client';
import type { DevDockSettings, EditorRecord, ProjectRecord, QuickStartPlan } from '../schema.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** The ui-settings settingsScope service (declared locally: the package
         *  root's own augmentation is not pulled by type-only imports). */
        settingsScope: {
            bind<T>(spec: {
                namespace: string;
                decode?: (section: unknown) => T | undefined;
            }): SettingsScope<T>;
        };
    }
}
/** Client-visible data snapshot: settings document plus readiness. */
export interface DevDockData {
    /** Loading until the first accepted settings section. */
    ready: boolean;
    /** The settings document; undefined before readiness. */
    settings: DevDockSettings | undefined;
}
/** Actions the UI may invoke on the data layer. */
export interface DevDockActions {
    /** Upsert one project record (id minted host-side on insert). */
    saveProject(project: Omit<ProjectRecord, 'id' | 'createdAt'>): Promise<void>;
    /** Remove one project; cascades quick-start references host-side. */
    removeProject(projectId: string): Promise<void>;
    /** Replace the editor records. */
    setEditors(editors: EditorRecord[]): Promise<void>;
    /** Replace the quick-start plans. */
    setQuickStarts(plans: QuickStartPlan[]): Promise<void>;
    /** Replace one quick-start plan. */
    setQuickStartPlan(plan: QuickStartPlan): Promise<void>;
    /** Prompt the current session to run a devDock action tool. */
    promptAgent(text: string): Promise<boolean>;
}
/**
 * Create the devDock data layer for one client plugin fiber.
 * @param ctx - client root context (needs settingsScope, remote, connection).
 * @returns the data store and action facade.
 */
export declare function createDevDockData(ctx: ClientContext): {
    store: SnapshotStore<DevDockData>;
    actions: DevDockActions;
};
//# sourceMappingURL=api.d.ts.map