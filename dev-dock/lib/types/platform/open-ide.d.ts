/**
 * Cross-platform "open project in IDE" actions. Every command goes through
 * the no-shell runner with an argv array; no shell string is ever built.
 * @module @liyuera/dsh-dev-dock/platform/open-ide
 */
import type { PlatformFacts } from './runner.ts';
/** IDE display name → macOS app bundle name. */
export declare const DARWIN_APP_NAMES: Record<string, string>;
/**
 * Open one project with an IDE.
 * @param facts - platform facts with an injectable runner.
 * @param projectPath - absolute project path.
 * @param editorName - canonical editor name.
 * @param editorPath - resolved editor executable/app path (detected or manual).
 * @returns ok, or an error message when the open failed.
 */
export declare function openProjectInIde(facts: PlatformFacts, projectPath: string, editorName: string, editorPath: string): Promise<{
    ok: true;
} | {
    ok: false;
    error: string;
}>;
//# sourceMappingURL=open-ide.d.ts.map