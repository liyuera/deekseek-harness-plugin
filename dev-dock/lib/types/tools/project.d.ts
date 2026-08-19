/**
 * Project registry tools: save (upsert), list, remove. All mutations go
 * through the plugin's settings namespace scope.
 * @module @liyuera/dsh-dev-dock/tools/project
 */
import type { SettingsScope } from '@deepseek-ai/dsh-settings';
import type { DevDockSettings, ProjectId, ProjectRecord } from '../schema.ts';
/** Scope facade the tools read and mutate. */
export interface DevDockScope {
    /** Read the current settings document. */
    get(): DevDockSettings;
    /** Merge a partial patch into the document. */
    update(patch: Partial<DevDockSettings>): void;
}
/** Wrap a live settings scope behind the tool facade. */
export declare function scopeOf(scope: SettingsScope<DevDockSettings>): DevDockScope;
/**
 * Mint the next project id (max numeric id + 1, or "1").
 * @param projects - current project list.
 * @returns the next id.
 */
export declare function nextProjectId(projects: readonly ProjectRecord[]): ProjectId;
/**
 * Upsert one project: same path keeps its id and createdAt (update overwrite).
 * @param current - current document.
 * @param project - candidate project record (id may be empty on insert).
 * @returns the new document and the stored record.
 */
export declare function upsertProject(current: DevDockSettings, project: Omit<ProjectRecord, 'id' | 'createdAt'> & {
    id?: ProjectId;
}): {
    next: DevDockSettings;
    stored: ProjectRecord;
};
/**
 * Remove one project and cascade-clean its quick-start references.
 * @param current - current document.
 * @param projectId - project id to remove.
 * @returns the new document; false when the id did not exist.
 */
export declare function removeProject(current: DevDockSettings, projectId: ProjectId): {
    next: DevDockSettings;
} | null;
/** Tool: save one analyzed project (insert or update overwrite). */
export declare function saveProjectTool(scope: DevDockScope): import("@deepseek-ai/dsh-tools").ToolDefinition;
/** Tool: list all registered projects. */
export declare function listProjectsTool(scope: DevDockScope): import("@deepseek-ai/dsh-tools").ToolDefinition;
/** Tool: remove one project from the registry (cascades quick-start references). */
export declare function removeProjectTool(scope: DevDockScope): import("@deepseek-ai/dsh-tools").ToolDefinition;
//# sourceMappingURL=project.d.ts.map