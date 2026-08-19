/**
 * Windows editor detection: registry App Paths (HKCU then HKLM) with a
 * `where` PATH fallback.
 * @module @liyuera/dsh-dev-dock/platform/editors-win32
 */
import type { PlatformFacts } from './runner.ts';
/** Known Windows editor executables. */
export declare const WIN32_EDITOR_EXES: ReadonlyArray<{
    name: string;
    exe: string;
}>;
/**
 * Locate one editor executable via registry then `where`.
 * @param facts - platform facts.
 * @param exe - executable name.
 * @returns the executable path or undefined when not installed.
 */
export declare function detectWin32Editor(facts: PlatformFacts, exe: string): Promise<string | undefined>;
/**
 * Detect every known Windows editor.
 * @param facts - platform facts.
 * @returns detected editor paths keyed by editor name.
 */
export declare function detectWin32Editors(facts: PlatformFacts): Promise<Record<string, string>>;
//# sourceMappingURL=editors-win32.d.ts.map