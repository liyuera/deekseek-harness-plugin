/**
 * Editor detection service: merges live auto-detection with user-configured
 * paths from settings. The detection routines themselves live in the
 * platform directory.
 * @module @liyuera/dsh-dev-dock/editors
 */
import type { EditorRecord } from './schema.ts';
import type { PlatformFacts } from './platform/runner.ts';
/** Known editor names across platforms (union for stable UI display). */
export declare const KNOWN_EDITORS: readonly ["WebStorm", "VS Code", "IntelliJ IDEA", "Cursor", "Sublime Text", "HBuilderX"];
/** Preferable non-uni-app editors, in preference order. */
export declare const PREFERRED_EDITORS: readonly ["WebStorm", "VS Code", "Cursor", "IntelliJ IDEA", "Sublime Text"];
/**
 * Run platform editor detection.
 * @param facts - platform facts.
 * @returns detected paths keyed by editor name.
 */
export declare function detectEditors(facts: PlatformFacts): Promise<Record<string, string>>;
/**
 * Merge detected paths with manual configuration: manual overrides detection
 * for the same editor; detected paths refresh the cache.
 * @param detected - live detection result.
 * @param stored - editors from settings.
 * @returns merged editor records; empty entries are dropped.
 */
export declare function mergeEditors(detected: Record<string, string>, stored: readonly EditorRecord[]): EditorRecord[];
//# sourceMappingURL=editors.d.ts.map