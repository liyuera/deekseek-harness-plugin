/**
 * Editor detection tool: merges live auto-detection with user-configured
 * paths from settings, and persists detected paths back for the UI.
 * @module @liyuera/dsh-dev-dock/tools/editors
 */
import type { DevDockScope } from './project.ts';
import type { EditorRecord } from '../schema.ts';
import type { PlatformFacts } from '../platform/runner.ts';
/** Known editor names across platforms (union for stable UI display). */
export declare const KNOWN_EDITORS: readonly ["WebStorm", "VS Code", "IntelliJ IDEA", "Cursor", "Sublime Text", "HBuilderX"];
/**
 * Run platform editor detection.
 * @param facts - platform facts.
 * @returns detected paths keyed by editor name.
 */
export declare function detectEditors(facts: PlatformFacts): Promise<Record<string, string>>;
/**
 * Merge detected paths with manual configuration: detected wins unless a
 * manual path exists (manual overrides detection for the same editor).
 * @param detected - live detection result.
 * @param stored - editors from settings.
 * @returns merged editor records, persisted order kept, new names appended.
 */
export declare function mergeEditors(detected: Record<string, string>, stored: readonly EditorRecord[]): EditorRecord[];
/** Tool: detect installed editors and merge user configuration. */
export declare function listEditorsTool(scope: DevDockScope, facts: PlatformFacts): import("@deepseek-ai/dsh-tools").ToolDefinition;
//# sourceMappingURL=editors.d.ts.map