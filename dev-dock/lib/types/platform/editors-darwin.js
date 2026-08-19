/**
 * macOS editor detection: Spotlight (mdfind) with a filesystem fallback
 * under /Applications and ~/Applications.
 * @module @liyuera/dsh-dev-dock/platform/editors-darwin
 */
/** Known macOS editor app bundles. */
export const DARWIN_EDITOR_APPS = [
    { name: 'WebStorm', app: 'WebStorm.app' },
    { name: 'VS Code', app: 'Visual Studio Code.app' },
    { name: 'IntelliJ IDEA', app: 'IntelliJ IDEA.app' },
    { name: 'Cursor', app: 'Cursor.app' },
    { name: 'Sublime Text', app: 'Sublime Text.app' },
    { name: 'HBuilderX', app: 'HBuilderX.app' },
];
/**
 * Resolve one app bundle path via Spotlight, then the filesystem fallback.
 * @param facts - platform facts with an injectable runner.
 * @param app - app bundle name (e.g. "WebStorm.app").
 * @returns the app path or undefined when not installed.
 */
export async function detectDarwinApp(facts, app) {
    try {
        const { stdout } = await facts.run('mdfind', [`kMDItemContentType == 'com.apple.application-bundle' && kMDItemFSName == '${app}'`], new AbortController().signal);
        const hit = stdout.trim().split('\n').find((line) => line.trim().length > 0);
        if (hit !== undefined)
            return hit.trim();
    }
    catch {
        // Spotlight unavailable or unindexed: fall through to filesystem probe.
    }
    for (const base of ['/Applications', `${facts.home}/Applications`]) {
        try {
            const { stdout } = await facts.run('/bin/test', ['-d', `${base}/${app}`], new AbortController().signal);
            if (stdout === '')
                return `${base}/${app}`;
        }
        catch {
            // Not present at this base.
        }
    }
    return undefined;
}
/**
 * Detect every known macOS editor.
 * @param facts - platform facts.
 * @returns detected editor paths keyed by editor name.
 */
export async function detectDarwinEditors(facts) {
    const result = {};
    for (const { name, app } of DARWIN_EDITOR_APPS) {
        const path = await detectDarwinApp(facts, app);
        if (path !== undefined)
            result[name] = path;
    }
    return result;
}
//# sourceMappingURL=editors-darwin.js.map