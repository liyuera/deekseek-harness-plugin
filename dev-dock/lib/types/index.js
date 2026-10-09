/**
 * devDock plugin v2, node half. Projects are dsh workspaces; this half
 * registers the `dev-dock` settings namespace and the desktop-action HTTP
 * route (`POST /dev-dock/action`) that the browser half calls for editor
 * detection and the desktop actions (open editor / system terminal /
 * start-work). Deterministic execution: no agent, no tools, no approval
 * prompt — the button click is the user's authorization. The only guard is
 * the sandbox mode: `read-only` denies desktop side effects.
 *
 * Transport note: static client bundles have no package-private RPC channel
 * (host.call is a dynamic-plugin builtin), so the browser half reaches the
 * host through a same-origin route on the loopback web server.
 * @module @liyuera/dsh-dev-dock
 */
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { DomainError } from '@deepseek-ai/dsh-storage-domain';
import { DevDockDocumentSchema, DEV_DOCK_FIELDS, EMPTY_DEV_DOCK_SETTINGS, } from "./schema.js";
import { devDockDomain } from "./domain.js";
import { detectEditors, mergeEditors } from "./editors.js";
import { openIdeFor, openTerminalFor, resolveWorkspaceEditor, startFor, startWorkFor, } from "./actions.js";
import { liveFacts } from "./platform/runner.js";
import { detectDarwinApp } from "./platform/editors-darwin.js";
/** Plugin identity. */
export const name = 'dev-dock';
/**
 * Services required by the host half. `webServer` and `storageDomain` mount
 * later in the tree than this row, so they must be declared here: reading them
 * through `ctx.get` in `apply` would find an empty context and silently leave
 * every route and the document unregistered.
 */
export const inject = ['webServer', 'storageDomain', 'workspaceRegistry'];
/** Guard against reading an argument that is not a JSON object. */
function asObject(value) {
    return typeof value === 'object' && value !== null ? value : {};
}
/** Shared preflight for the unary actions: sandbox guard, id, path. */
function guardWorkspace(readOnly, registry, args) {
    if (readOnly) {
        return { block: { ok: false, error: 'read-only sandbox denies desktop actions' } };
    }
    const workspaceId = typeof args.workspaceId === 'string' ? args.workspaceId : '';
    if (registry === undefined) {
        return { block: { ok: false, error: 'workspace registry service unavailable' } };
    }
    const workspace = registry.get(workspaceId);
    if (workspace === undefined) {
        return { block: { ok: false, error: `workspace ${workspaceId || '(missing)'} not found` } };
    }
    if (!existsSync(workspace.path)) {
        return { block: { ok: false, error: `workspace directory ${workspace.path} does not exist` } };
    }
    return { workspace };
}
/** Dispatch one action body; returns the JSON-serializable answer. */
async function dispatchAction(readOnly, getRegistry, devDock, facts, body) {
    const action = typeof body.action === 'string' ? body.action : '';
    switch (action) {
        case 'list-editors': {
            try {
                const detected = await detectEditors(facts);
                const merged = mergeEditors(detected, devDock.get().editors);
                devDock.update({ editors: merged });
                return { ok: true, editors: merged };
            }
            catch (error) {
                return { ok: false, error: error instanceof Error ? error.message : String(error) };
            }
        }
        case 'open-ide': {
            const guard = guardWorkspace(readOnly(), getRegistry(), asObject(body));
            if ('block' in guard)
                return guard.block;
            return openIdeFor(devDock, facts, guard.workspace);
        }
        case 'open-terminal': {
            const guard = guardWorkspace(readOnly(), getRegistry(), asObject(body));
            if ('block' in guard)
                return guard.block;
            return openTerminalFor(devDock, facts, guard.workspace);
        }
        case 'start': {
            const guard = guardWorkspace(readOnly(), getRegistry(), asObject(body));
            if ('block' in guard)
                return guard.block;
            return startFor(devDock, facts, guard.workspace);
        }
        case 'start-work': {
            if (readOnly()) {
                return { ok: false, opened: 0, started: 0, items: [], error: 'read-only sandbox denies desktop actions' };
            }
            const registry = getRegistry();
            const ids = Array.isArray(body.workspaceIds)
                ? body.workspaceIds.filter((id) => typeof id === 'string')
                : [];
            const workspaces = ids
                .map((id) => registry?.get(id))
                .filter((w) => w !== undefined);
            if (workspaces.length === 0) {
                return { ok: false, opened: 0, started: 0, items: [], error: 'no workspaces selected' };
            }
            return startWorkFor(devDock, facts, workspaces);
        }
        default:
            return { ok: false, error: `unknown dev-dock action ${JSON.stringify(action || '(empty)')}` };
    }
}
/** Write one JSON answer. */
function writeJson(res, status, value) {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(value));
}
/** Open attempts tolerated while a reloaded fiber's predecessor still holds the domain. */
const OPEN_ATTEMPTS = 10;
/** Delay between open attempts, in ms. */
const OPEN_RETRY_MS = 100;
/**
 * Open the document's domain, tolerating the short window in which a reloaded
 * fiber's predecessor still holds the installation-wide domain name.
 * @param facility - mounted domain facility.
 * @returns the opened domain.
 */
async function openDomain(facility) {
    for (let attempt = 1;; attempt += 1) {
        try {
            return await facility.open(devDockDomain);
        }
        catch (error) {
            const retryable = error instanceof DomainError && error.code === 'already-open';
            if (!retryable || attempt >= OPEN_ATTEMPTS)
                throw error;
            await new Promise(resolve => setTimeout(resolve, OPEN_RETRY_MS));
        }
    }
}
/** Read one addressed field out of a browser write body. */
function readFieldWrite(body) {
    const field = body.field;
    if (typeof field !== 'string')
        return undefined;
    if (!DEV_DOCK_FIELDS.includes(field))
        return undefined;
    return { field: field, value: body.value };
}
/**
 * Register the document domain, the state route, and the desktop-action routes.
 * @param ctx - Cordis context carrying the web server, the storage facility, the
 * workspace registry, and the sandbox policy.
 */
export function apply(ctx) {
    const facts = liveFacts();
    const readOnly = () => {
        const sandbox = ctx.get('sandboxPolicy');
        return sandbox?.resolve().mode === 'read-only';
    };
    const getRegistry = () => ctx.get('workspaceRegistry');
    const webServer = ctx.get('webServer');
    if (webServer === undefined) {
        // No HTTP carrier (headless profile): the browser half is not mounted
        // either, so there is nothing to serve and no document to read.
        return;
    }
    // The authoritative in-memory document. `get` stays synchronous for the
    // action helpers; durability is ordered through `writes` below, and the
    // storage medium is the source of truth on reopen.
    let current = EMPTY_DEV_DOCK_SETTINGS;
    const pending = openDomain(ctx.get('storageDomain'))
        .then((domain) => {
        current = domain.global.get();
        return domain;
    });
    // The route reports this rejection as a 503; nothing else observes it.
    pending.catch(() => { });
    ctx.effect(() => () => { void pending.then(domain => domain.close()).catch(() => { }); }, 'dev-dock: document domain lifetime');
    let writes = Promise.resolve();
    const devDock = {
        get: () => current,
        update: (patch) => {
            const next = { ...current, ...patch };
            current = next;
            writes = writes.then(() => pending).then(domain => domain.global.set(next));
            // A failed write is visible on the next state read; the document keeps
            // the value the session already saw rather than reverting mid-gesture.
            writes.catch(() => { });
        },
    };
    ctx.effect(() => webServer.register({
        kind: 'exact',
        path: '/dev-dock/state',
        handler: async (req, res) => {
            if (req.method === 'GET') {
                try {
                    await pending;
                    writeJson(res, 200, { ok: true, settings: devDock.get() });
                }
                catch (error) {
                    writeJson(res, 503, { ok: false, error: error instanceof Error ? error.message : String(error) });
                }
                return;
            }
            if (req.method !== 'POST') {
                writeJson(res, 405, { ok: false, error: 'method not allowed' });
                return;
            }
            const chunks = [];
            for await (const chunk of req)
                chunks.push(chunk);
            let body;
            try {
                body = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
            }
            catch {
                writeJson(res, 400, { ok: false, error: 'invalid JSON body' });
                return;
            }
            const write = readFieldWrite(body);
            if (write === undefined) {
                writeJson(res, 400, { ok: false, error: `unknown dev-dock field ${JSON.stringify(body.field ?? '(missing)')}` });
                return;
            }
            const parsed = DevDockDocumentSchema.safeParse({ ...devDock.get(), [write.field]: write.value });
            if (!parsed.success) {
                const detail = parsed.error.issues[0]?.message ?? 'value rejected by the document schema';
                writeJson(res, 400, { ok: false, error: `${write.field}: ${detail}` });
                return;
            }
            try {
                await pending;
                devDock.update({ [write.field]: parsed.data[write.field] });
                await writes;
                writeJson(res, 200, { ok: true, settings: devDock.get() });
            }
            catch (error) {
                writeJson(res, 503, { ok: false, error: error instanceof Error ? error.message : String(error) });
            }
        },
    }), 'dev-dock: state route');
    ctx.effect(() => webServer.register({
        kind: 'exact',
        path: '/dev-dock/action',
        handler: async (req, res) => {
            if (req.method !== 'POST') {
                writeJson(res, 405, { ok: false, error: 'method not allowed' });
                return;
            }
            const chunks = [];
            for await (const chunk of req) {
                chunks.push(chunk);
            }
            let body;
            try {
                body = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
            }
            catch {
                writeJson(res, 400, { ok: false, error: 'invalid JSON body' });
                return;
            }
            try {
                writeJson(res, 200, await dispatchAction(readOnly, getRegistry, devDock, facts, body));
            }
            catch (error) {
                writeJson(res, 200, {
                    ok: false,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        },
    }), 'dev-dock: action route');
    // Editor app icon route: render the app bundle's icon (macOS QuickLook)
    // so the settings page can show the real editor icons.
    ctx.effect(() => webServer.register({
        kind: 'exact',
        path: '/dev-dock/editor-icon',
        handler: async (req, res) => {
            if (req.method !== 'GET') {
                writeJson(res, 405, { ok: false, error: 'method not allowed' });
                return;
            }
            const url = new URL(req.url ?? '/', 'http://dsh.internal');
            const editor = url.searchParams.get('editor') ?? '';
            const entry = devDock.get().editors.find((e) => e.name === editor);
            // Manual path wins by truthiness (an empty manual entry falls back to
            // the detected path, same as the action resolver).
            const appPath = entry?.manualPath || entry?.detectedPath;
            if (entry === undefined || appPath === undefined || !existsSync(appPath)) {
                writeJson(res, 404, { ok: false, error: `editor ${editor} has no resolvable app path` });
                return;
            }
            try {
                const png = await renderAppIconPng(facts, appPath);
                res.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'no-store' });
                res.end(png);
            }
            catch (error) {
                writeJson(res, 404, { ok: false, error: error instanceof Error ? error.message : String(error) });
            }
        },
    }), 'dev-dock: editor-icon route');
    // Per-workspace default editor icon: resolves the same way open-ide does
    // (preference, then trait/installed default) and serves the app icon.
    ctx.effect(() => webServer.register({
        kind: 'exact',
        path: '/dev-dock/workspace-editor-icon',
        handler: async (req, res) => {
            if (req.method !== 'GET') {
                writeJson(res, 405, { ok: false, error: 'method not allowed' });
                return;
            }
            const url = new URL(req.url ?? '/', 'http://dsh.internal');
            const workspaceId = url.searchParams.get('workspaceId') ?? '';
            const workspace = getRegistry()?.get(workspaceId);
            if (workspace === undefined || !existsSync(workspace.path)) {
                writeJson(res, 404, { ok: false, error: `workspace ${workspaceId || '(missing)'} not found` });
                return;
            }
            const resolved = await resolveWorkspaceEditor(devDock, facts, workspace);
            if (!resolved.ok) {
                writeJson(res, 404, { ok: false, error: resolved.error });
                return;
            }
            try {
                const png = await renderAppIconPng(facts, resolved.path);
                res.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'no-store' });
                res.end(png);
            }
            catch (error) {
                writeJson(res, 404, { ok: false, error: error instanceof Error ? error.message : String(error) });
            }
        },
    }), 'dev-dock: workspace-editor-icon route');
    // Terminal app icon: Terminal.app (default) or iTerm2, resolved like the
    // open-terminal action and rendered through the same pipeline.
    ctx.effect(() => webServer.register({
        kind: 'exact',
        path: '/dev-dock/terminal-icon',
        handler: async (req, res) => {
            if (req.method !== 'GET') {
                writeJson(res, 405, { ok: false, error: 'method not allowed' });
                return;
            }
            const url = new URL(req.url ?? '/', 'http://dsh.internal');
            const app = url.searchParams.get('app') === 'iterm' ? 'iterm' : 'default';
            const appPath = await resolveTerminalAppPath(facts, app);
            if (appPath === undefined) {
                writeJson(res, 404, { ok: false, error: `terminal ${app} not found` });
                return;
            }
            try {
                const png = await renderAppIconPng(facts, appPath);
                res.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'no-store' });
                res.end(png);
            }
            catch (error) {
                writeJson(res, 404, { ok: false, error: error instanceof Error ? error.message : String(error) });
            }
        },
    }), 'dev-dock: terminal-icon route');
}
/** Terminal app bundle path preference: 'iterm' or the macOS default. */
async function resolveTerminalAppPath(facts, app) {
    if (app === 'default') {
        return existsSync('/System/Applications/Utilities/Terminal.app')
            ? '/System/Applications/Utilities/Terminal.app'
            : undefined;
    }
    for (const candidate of ['/Applications/iTerm.app', '/Applications/iTerm2.app']) {
        if (existsSync(candidate))
            return candidate;
    }
    return detectDarwinApp(facts, 'iTerm.app');
}
/** Icon cache: one rendered PNG per editor app path. */
const ICON_CACHE = new Map();
/**
 * Render one macOS editor bundle path to a 128px PNG. Resolution order:
 * `CFBundleIconFile` from Info.plist (via plutil) → .icns → sips convert →
 * AppIcon.iconset PNG fallback. Only macOS is supported; other platforms and
 * unresolvable bundles throw a describing error.
 * @param facts - platform facts with the injectable runner.
 * @param appPath - editor .app directory.
 * @returns the PNG bytes.
 */
async function renderAppIconPng(facts, appPath) {
    const cached = ICON_CACHE.get(appPath);
    if (cached !== undefined)
        return cached;
    if (facts.platform !== 'darwin') {
        throw new Error('editor icons are macOS-only');
    }
    const resources = join(appPath, 'Contents', 'Resources');
    const signal = new AbortController().signal;
    // 1. Preferred name from Info.plist; tolerate the value already carrying
    // the .icns extension and missing plist extraction.
    let iconBase = '';
    try {
        const { stdout } = await facts.run('plutil', ['-extract', 'CFBundleIconFile', 'raw', '-o', '-', join(appPath, 'Contents', 'Info.plist')], signal);
        const name = stdout.trim();
        if (name !== '')
            iconBase = name.toLowerCase().endsWith('.icns') ? name.slice(0, -5) : name;
    }
    catch {
        // No extractable CFBundleIconFile: fall back to conventional names below.
    }
    // 2. .icns candidate set, then sips conversion.
    const icnsCandidates = [];
    if (iconBase !== '')
        icnsCandidates.push(join(resources, `${iconBase}.icns`));
    const appBase = basename(appPath, '.app');
    const conventional = ['icon.icns', `${appBase}.icns`, 'AppIcon.icns'];
    for (const name of conventional)
        icnsCandidates.push(join(resources, name));
    for (const icnsPath of icnsCandidates) {
        if (!existsSync(icnsPath))
            continue;
        const dir = mkdtempSync(join(tmpdir(), 'devdock-icon-'));
        try {
            const outPath = join(dir, 'icon.png');
            await facts.run('sips', ['-s', 'format', 'png', '-z', '128', '128', icnsPath, '--out', outPath], signal);
            if (!existsSync(outPath))
                continue;
            const bytes = readFileSync(outPath);
            ICON_CACHE.set(appPath, bytes);
            return bytes;
        }
        finally {
            rmSync(dir, { recursive: true, force: true });
        }
    }
    // 3. iconset PNG fallback (newer bundles ship one instead of a .icns).
    const iconset = join(resources, `${iconBase === '' ? appBase : iconBase}.iconset`);
    for (const name of ['icon_512x512@2x.png', 'icon_256x256@2x.png', 'icon_512x512.png', 'icon_128x128@2x.png', 'icon_256x256.png', 'icon_128x128.png']) {
        const pngPath = join(iconset, name);
        if (existsSync(pngPath)) {
            const bytes = readFileSync(pngPath);
            ICON_CACHE.set(appPath, bytes);
            return bytes;
        }
    }
    // 4. QuickLook thumbnail (bundles whose icons live in Assets.car, e.g.
    // Terminal.app); bounded to 8s and best-effort.
    const quicklook = await tryQuickLookPng(facts, appPath);
    if (quicklook !== undefined) {
        ICON_CACHE.set(appPath, quicklook);
        return quicklook;
    }
    throw new Error(`no icon resource found in ${appPath}`);
}
/**
 * Best-effort QuickLook thumbnail of one app bundle (8s bound). Covers
 * bundles whose icon lives in Assets.car and has no .icns/.iconset; returns
 * undefined when QuickLook is unavailable or times out.
 * @param facts - platform facts with the injectable runner.
 * @param appPath - app bundle directory.
 * @returns the PNG bytes, or undefined.
 */
async function tryQuickLookPng(facts, appPath) {
    const dir = mkdtempSync(join(tmpdir(), 'devdock-ql-'));
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        try {
            await facts.run('qlmanage', ['-t', '-s', '128', '-o', dir, appPath], controller.signal);
        }
        finally {
            clearTimeout(timer);
        }
        const pngPath = join(dir, `${basename(appPath)}.png`);
        if (!existsSync(pngPath))
            return undefined;
        return readFileSync(pngPath);
    }
    catch {
        return undefined;
    }
    finally {
        rmSync(dir, { recursive: true, force: true });
    }
}
//# sourceMappingURL=index.js.map