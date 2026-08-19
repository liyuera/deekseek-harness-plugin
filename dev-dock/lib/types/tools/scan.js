/**
 * Deterministic directory scan for frontend project candidates. The tool
 * returns raw signals only — the AI decides which candidates are frontend
 * projects and what their environment is.
 * @module @liyuera/dsh-dev-dock/tools/scan
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { defineTool } from '@deepseek-ai/dsh-tools';
/** Lock-file names mapped to package managers. */
const LOCK_TO_MANAGER = [
    ['pnpm-lock.yaml', 'pnpm'],
    ['yarn.lock', 'yarn'],
    ['package-lock.json', 'npm'],
    ['bun.lockb', 'bun'],
];
/** Directory names never treated as project candidates. */
const SKIP_NAMES = new Set([
    'node_modules', '.git', 'dist', 'build', 'out', 'coverage', '.idea', '.vscode',
    '.DS_Store', 'unpackage', 'uni_modules', 'miniprogram_npm', 'assets', 'static',
]);
/**
 * Read package.json of one candidate; tolerant of missing or malformed files.
 * @param dir - candidate directory.
 * @returns parsed package.json or null.
 */
function readPackageJson(dir) {
    const pkgPath = join(dir, 'package.json');
    if (!existsSync(pkgPath))
        return null;
    try {
        const parsed = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        return parsed && typeof parsed === 'object' ? parsed : null;
    }
    catch {
        return null;
    }
}
/**
 * Collect signals for one candidate directory.
 * @param dir - absolute candidate directory.
 * @returns candidate signals.
 */
export function collectSignals(dir) {
    const pkg = readPackageJson(dir);
    const hasPackageJson = existsSync(join(dir, 'package.json'));
    const scripts = (pkg?.scripts !== null && typeof pkg?.scripts === 'object'
        ? pkg.scripts
        : {});
    const deps = {
        ...(pkg?.dependencies !== null && typeof pkg?.dependencies === 'object'
            ? pkg.dependencies
            : {}),
        ...(pkg?.devDependencies !== null && typeof pkg?.devDependencies === 'object'
            ? pkg.devDependencies
            : {}),
    };
    const hasManifest = existsSync(join(dir, 'manifest.json')) || existsSync(join(dir, 'src', 'manifest.json'));
    const hasMiniappConfig = existsSync(join(dir, 'project.config.json'))
        || existsSync(join(dir, 'miniprogramRoot'));
    const lock = LOCK_TO_MANAGER.find(([file]) => existsSync(join(dir, file)))?.[0];
    const nodeVersionFile = existsSync(join(dir, '.nvmrc')) || existsSync(join(dir, '.node-version'));
    const signals = {
        path: dir,
        name: basename(dir),
        hasPackageJson,
        hasManifest,
        hasMiniappConfig,
        hasNodeVersionFile: nodeVersionFile,
        dependencies: Object.keys(deps),
        scriptNames: Object.keys(scripts),
    };
    if (lock !== undefined)
        signals.lockFile = lock;
    if (typeof pkg?.description === 'string')
        signals.description = pkg.description;
    return signals;
}
/**
 * Scan one directory: the directory itself plus its direct children.
 * @param root - absolute directory to scan.
 * @returns candidate signals for the root and each direct subdirectory.
 */
export function scanCandidates(root) {
    const results = [];
    const push = (dir) => {
        try {
            if (statSync(dir).isDirectory())
                results.push(collectSignals(dir));
        }
        catch {
            // Unreadable entry: skip.
        }
    };
    push(root);
    let entries = [];
    try {
        entries = readdirSync(root);
    }
    catch {
        return results;
    }
    for (const entry of entries) {
        if (entry.startsWith('.') || SKIP_NAMES.has(entry))
            continue;
        push(join(root, entry));
    }
    return results;
}
/** Model-facing tool: scan one directory for frontend project candidates. */
export const scanCandidatesTool = defineTool({
    name: 'dev-dock_scan-candidates',
    description: 'Scan a directory for frontend project candidates. Returns the directory itself and its direct subdirectories with raw signals: presence of package.json / manifest.json / miniapp config, lock file, node version file, key dependencies, and script names. Use the signals to judge which candidates are frontend projects and analyze their environment, then save them with dev-dock_save-project.',
    parameters: {
        dir: { type: 'string', required: true, description: 'Absolute directory path to scan' },
    },
    output: {
        schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                root: { type: 'string', required: true },
                candidates: {
                    type: 'array',
                    required: true,
                    items: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                            path: { type: 'string', required: true },
                            name: { type: 'string', required: true },
                            hasPackageJson: { type: 'boolean', required: true },
                            hasManifest: { type: 'boolean', required: true },
                            hasMiniappConfig: { type: 'boolean', required: true },
                            lockFile: { type: 'string' },
                            hasNodeVersionFile: { type: 'boolean', required: true },
                            dependencies: { type: 'array', required: true, items: { type: 'string' } },
                            scriptNames: { type: 'array', required: true, items: { type: 'string' } },
                            description: { type: 'string' },
                        },
                    },
                },
            },
        },
        render: (_args, value) => [{
                type: 'text',
                text: formatCandidates(value),
            }],
    },
    async execute(args) {
        if (args.dir.trim().length === 0) {
            throw new Error('invalid dir: expected a non-empty string');
        }
        const candidates = scanCandidates(args.dir);
        return { root: args.dir, candidates };
    },
});
/** Human-readable candidate listing for the model result. */
function formatCandidates(value) {
    const lines = value.candidates.map((c) => {
        const markers = [];
        if (c.hasPackageJson)
            markers.push('package.json');
        if (c.hasManifest)
            markers.push('manifest.json');
        if (c.hasMiniappConfig)
            markers.push('miniapp');
        if (c.lockFile)
            markers.push(c.lockFile);
        if (c.hasNodeVersionFile)
            markers.push('node-version');
        const deps = c.dependencies.length > 0 ? ` deps: ${c.dependencies.slice(0, 12).join(',')}` : '';
        const scripts = c.scriptNames.length > 0 ? ` scripts: ${c.scriptNames.slice(0, 10).join(',')}` : '';
        return `${c.path} [${markers.join(',') || 'no project markers'}${deps}${scripts}]`;
    });
    return [`Scanned ${value.candidates.length} candidate(s) under ${value.root}:`, ...lines].join('\n');
}
//# sourceMappingURL=scan.js.map