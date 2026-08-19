/**
 * Editor detection tool: merges live auto-detection with user-configured
 * paths from settings, and persists detected paths back for the UI.
 * @module @liyuera/dsh-dev-dock/tools/editors
 */
import { defineTool } from '@deepseek-ai/dsh-tools';
import { detectDarwinEditors } from "../platform/editors-darwin.js";
import { detectWin32Editors } from "../platform/editors-win32.js";
/** Known editor names across platforms (union for stable UI display). */
export const KNOWN_EDITORS = [
    'WebStorm', 'VS Code', 'IntelliJ IDEA', 'Cursor', 'Sublime Text', 'HBuilderX',
];
/**
 * Run platform editor detection.
 * @param facts - platform facts.
 * @returns detected paths keyed by editor name.
 */
export async function detectEditors(facts) {
    if (facts.platform === 'win32')
        return detectWin32Editors(facts);
    return detectDarwinEditors(facts);
}
/**
 * Merge detected paths with manual configuration: detected wins unless a
 * manual path exists (manual overrides detection for the same editor).
 * @param detected - live detection result.
 * @param stored - editors from settings.
 * @returns merged editor records, persisted order kept, new names appended.
 */
export function mergeEditors(detected, stored) {
    const byName = new Map(stored.map((e) => [e.name, { ...e }]));
    for (const name of KNOWN_EDITORS) {
        const current = byName.get(name);
        const detectedPath = detected[name];
        if (current !== undefined) {
            if (detectedPath !== undefined)
                current.detectedPath = detectedPath;
            else
                delete current.detectedPath;
        }
        else {
            const entry = { name };
            if (detectedPath !== undefined)
                entry.detectedPath = detectedPath;
            byName.set(name, entry);
        }
    }
    for (const [name, entry] of byName) {
        if (!KNOWN_EDITORS.includes(name)) {
            byName.delete(name);
            continue;
        }
        if (entry.detectedPath === undefined && entry.manualPath === undefined)
            byName.delete(name);
    }
    return [...byName.values()];
}
/** Tool: detect installed editors and merge user configuration. */
export function listEditorsTool(scope, facts) {
    return defineTool({
        name: 'dev-dock_list-editors',
        description: 'Detect code editors installed on this machine (WebStorm, VS Code, IntelliJ IDEA, Cursor, Sublime Text, HBuilderX) and merge user-configured paths. Returns each editor with its detected path and/or manual path.',
        parameters: {},
        output: {
            schema: {
                type: 'array',
                items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        name: { type: 'string', required: true },
                        detectedPath: { type: 'string' },
                        manualPath: { type: 'string' },
                    },
                },
            },
            render: (_args, value) => [{ type: 'text', text: formatEditors(value) }],
        },
        async execute() {
            const detected = await detectEditors(facts);
            const merged = mergeEditors(detected, scope.get().editors);
            scope.update({ editors: merged });
            return merged;
        },
    });
}
/** Human-readable editor listing for the model result. */
function formatEditors(editors) {
    if (editors.length === 0)
        return 'No editors detected or configured.';
    return editors.map((e) => {
        const parts = [e.name];
        if (e.detectedPath)
            parts.push(`detected: ${e.detectedPath}`);
        if (e.manualPath)
            parts.push(`manual: ${e.manualPath}`);
        if (!e.detectedPath && !e.manualPath)
            parts.push('(not installed)');
        return parts.join('\t');
    }).join('\n');
}
//# sourceMappingURL=editors.js.map