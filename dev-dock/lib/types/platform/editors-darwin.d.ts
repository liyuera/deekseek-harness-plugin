/**
 * macOS editor detection: Spotlight (mdfind) with a filesystem fallback
 * under /Applications and ~/Applications.
 * @module @liyuera/dsh-dev-dock/platform/editors-darwin
 */
import type { PlatformFacts } from './runner.ts';
/** Known macOS editor app bundles. */
export declare const DARWIN_EDITOR_APPS: ReadonlyArray<{
    name: string;
    app: string;
}>;
/**
 * Resolve one app bundle path via Spotlight, then the filesystem fallback.
 * @param facts - platform facts with an injectable runner.
 * @param app - app bundle name (e.g. "WebStorm.app").
 * @returns the app path or undefined when not installed.
 */
export declare function detectDarwinApp(facts: PlatformFacts, app: string): Promise<string | undefined>;
/**
 * Detect every known macOS editor.
 * @param facts - platform facts.
 * @returns detected editor paths keyed by editor name.
 */
export declare function detectDarwinEditors(facts: PlatformFacts): Promise<Record<string, string>>;
//# sourceMappingURL=editors-darwin.d.ts.map