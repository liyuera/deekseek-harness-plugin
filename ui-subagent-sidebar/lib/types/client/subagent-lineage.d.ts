/**
 * UI Subagent Sidebar-owned projection of descendant counts from Session
 * summaries. The same fold exists in the harness packages ui-subagent and
 * ui-workspace (each feature projects its own view; feature plugins never
 * runtime-import one another's values), so this plugin carries its copy.
 */
import type { SessionId } from '@deepseek-ai/dsh-session/types';
interface LineageEntry {
    readonly id: SessionId;
    readonly parentId?: SessionId;
    readonly origin?: 'subagent';
    readonly running: boolean;
}
/** Descendant counts for one possible parent Session. */
export interface SubagentDescendantSummary {
    readonly count: number;
    readonly runningCount: number;
}
/**
 * Index uninterrupted subagent descendants under each ancestor.
 * @param summaries - Session summaries keyed by id.
 * @returns descendant totals keyed by possible parent id.
 */
export declare function indexSubagentDescendants(summaries: Readonly<Record<SessionId, LineageEntry>>): ReadonlyMap<SessionId, SubagentDescendantSummary>;
export {};
//# sourceMappingURL=subagent-lineage.d.ts.map