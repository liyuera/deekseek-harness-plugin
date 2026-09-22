import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import z from "@deepseek-ai/schemastery";
import { runNativeCommand } from "@deepseek-ai/dsh-native-command";
//#region lib/types/schema.js
/**
* devDock settings namespace v2: per-workspace IDE preferences, editor
* manual paths, terminal preference, and the start-work selection memory.
* Projects are dsh workspaces, so no separate project registry exists.
* Persisted through the settings capability (`$DSH_HOME/settings.yaml`,
* namespace `dev-dock`).
* @module @liyuera/dsh-dev-dock/schema
*/
/** Branded settings namespace of this plugin. */
const DEV_DOCK_NAMESPACE = "dev-dock";
/** Schemastery schema for the whole document (registered by the host half). */
const DevDockSettingsSchema = z.object({
	workspacePrefs: z.array(z.object({
		workspaceId: z.string().required(),
		editor: z.string().required()
	})).default([]),
	editors: z.array(z.object({
		name: z.string().required(),
		detectedPath: z.string(),
		manualPath: z.string()
	})).default([]),
	terminalApp: z.union([z.const("default"), z.const("iterm")]).default("default"),
	startWork: z.array(z.string()).default([])
});
/** Empty settings document used as the schema base. */
const EMPTY_DEV_DOCK_SETTINGS = {
	workspacePrefs: [],
	editors: [],
	terminalApp: "default",
	startWork: []
};
//#endregion
//#region lib/types/platform/editors-darwin.js
/**
* macOS editor detection: Spotlight (mdfind) with a filesystem fallback
* under /Applications and ~/Applications.
* @module @liyuera/dsh-dev-dock/platform/editors-darwin
*/
/** Known macOS editor app bundles. */
const DARWIN_EDITOR_APPS = [
	{
		name: "WebStorm",
		app: "WebStorm.app"
	},
	{
		name: "VS Code",
		app: "Visual Studio Code.app"
	},
	{
		name: "IntelliJ IDEA",
		app: "IntelliJ IDEA.app"
	},
	{
		name: "Cursor",
		app: "Cursor.app"
	},
	{
		name: "Sublime Text",
		app: "Sublime Text.app"
	},
	{
		name: "HBuilderX",
		app: "HBuilderX.app"
	}
];
/**
* Resolve one app bundle path via Spotlight, then the filesystem fallback.
* @param facts - platform facts with an injectable runner.
* @param app - app bundle name (e.g. "WebStorm.app").
* @returns the app path or undefined when not installed.
*/
async function detectDarwinApp(facts, app) {
	try {
		const { stdout } = await facts.run("mdfind", [`kMDItemContentType == 'com.apple.application-bundle' && kMDItemFSName == '${app}'`], new AbortController().signal);
		const hit = stdout.trim().split("\n").find((line) => line.trim().length > 0);
		if (hit !== void 0) return hit.trim();
	} catch {}
	for (const base of ["/Applications", `${facts.home}/Applications`]) try {
		const { stdout } = await facts.run("/bin/test", ["-d", `${base}/${app}`], new AbortController().signal);
		if (stdout === "") return `${base}/${app}`;
	} catch {}
}
/**
* Detect every known macOS editor.
* @param facts - platform facts.
* @returns detected editor paths keyed by editor name.
*/
async function detectDarwinEditors(facts) {
	const result = {};
	for (const { name, app } of DARWIN_EDITOR_APPS) {
		const path = await detectDarwinApp(facts, app);
		if (path !== void 0) result[name] = path;
	}
	return result;
}
//#endregion
//#region lib/types/platform/editors-win32.js
/**
* Windows editor detection: registry App Paths (HKCU then HKLM) with a
* `where` PATH fallback.
* @module @liyuera/dsh-dev-dock/platform/editors-win32
*/
/** Known Windows editor executables. */
const WIN32_EDITOR_EXES = [
	{
		name: "WebStorm",
		exe: "webstorm64.exe"
	},
	{
		name: "VS Code",
		exe: "Code.exe"
	},
	{
		name: "IntelliJ IDEA",
		exe: "idea64.exe"
	},
	{
		name: "Cursor",
		exe: "cursor.exe"
	},
	{
		name: "Sublime Text",
		exe: "sublime_text.exe"
	},
	{
		name: "HBuilderX",
		exe: "HBuilderX.exe"
	}
];
/** Registry roots probed in order. */
const REGISTRY_ROOTS = ["HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\App Paths", "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\App Paths"];
/**
* Query one registry App Paths key and return its default value.
* @param facts - platform facts with an injectable runner.
* @param root - registry root.
* @param exe - executable name (the key name).
* @returns the registered executable path or undefined.
*/
async function queryAppPath(facts, root, exe) {
	try {
		const { stdout } = await facts.run("reg", [
			"query",
			`${root}\\${exe}`,
			"/ve"
		], new AbortController().signal);
		return /REG_SZ\s+(.+)$/m.exec(stdout)?.[1]?.trim() || void 0;
	} catch {
		return;
	}
}
/**
* Locate one editor executable via registry then `where`.
* @param facts - platform facts.
* @param exe - executable name.
* @returns the executable path or undefined when not installed.
*/
async function detectWin32Editor(facts, exe) {
	for (const root of REGISTRY_ROOTS) {
		const path = await queryAppPath(facts, root, exe);
		if (path !== void 0) return path;
	}
	try {
		const { stdout } = await facts.run("where", [exe], new AbortController().signal);
		return stdout.trim().split("\n").find((line) => line.trim().length > 0)?.trim() || void 0;
	} catch {
		return;
	}
}
/**
* Detect every known Windows editor.
* @param facts - platform facts.
* @returns detected editor paths keyed by editor name.
*/
async function detectWin32Editors(facts) {
	const result = {};
	for (const { name, exe } of WIN32_EDITOR_EXES) {
		const path = await detectWin32Editor(facts, exe);
		if (path !== void 0) result[name] = path;
	}
	return result;
}
//#endregion
//#region lib/types/editors.js
/**
* Editor detection service: merges live auto-detection with user-configured
* paths from settings. The detection routines themselves live in the
* platform directory.
* @module @liyuera/dsh-dev-dock/editors
*/
/** Known editor names across platforms (union for stable UI display). */
const KNOWN_EDITORS = [
	"WebStorm",
	"VS Code",
	"IntelliJ IDEA",
	"Cursor",
	"Sublime Text",
	"HBuilderX"
];
/** Preferable non-uni-app editors, in preference order. */
const PREFERRED_EDITORS = [
	"WebStorm",
	"VS Code",
	"Cursor",
	"IntelliJ IDEA",
	"Sublime Text"
];
/**
* Run platform editor detection.
* @param facts - platform facts.
* @returns detected paths keyed by editor name.
*/
async function detectEditors(facts) {
	if (facts.platform === "win32") return detectWin32Editors(facts);
	return detectDarwinEditors(facts);
}
/**
* Merge detected paths with manual configuration: manual overrides detection
* for the same editor; detected paths refresh the cache.
* @param detected - live detection result.
* @param stored - editors from settings.
* @returns merged editor records; empty entries are dropped.
*/
function mergeEditors(detected, stored) {
	const byName = new Map(stored.map((e) => [e.name, { ...e }]));
	for (const name of KNOWN_EDITORS) {
		const current = byName.get(name);
		const detectedPath = detected[name];
		if (current !== void 0) {
			if (detectedPath !== void 0) current.detectedPath = detectedPath;
			else delete current.detectedPath;
		} else {
			const entry = { name };
			if (detectedPath !== void 0) entry.detectedPath = detectedPath;
			byName.set(name, entry);
		}
	}
	for (const [name, entry] of byName) {
		if (!KNOWN_EDITORS.includes(name)) {
			byName.delete(name);
			continue;
		}
		if (entry.detectedPath === void 0 && entry.manualPath === void 0) byName.delete(name);
	}
	return [...byName.values()];
}
//#endregion
//#region lib/types/platform/open-ide.js
/**
* Cross-platform "open project in IDE" actions. Every command goes through
* the no-shell runner with an argv array; no shell string is ever built.
* @module @liyuera/dsh-dev-dock/platform/open-ide
*/
/** IDE display name → macOS app bundle name. */
const DARWIN_APP_NAMES = {
	WebStorm: "WebStorm",
	"VS Code": "Visual Studio Code",
	"IntelliJ IDEA": "IntelliJ IDEA",
	Cursor: "Cursor",
	"Sublime Text": "Sublime Text"
};
/**
* Open one project with an IDE.
* @param facts - platform facts with an injectable runner.
* @param projectPath - absolute project path.
* @param editorName - canonical editor name.
* @param editorPath - resolved editor executable/app path (detected or manual).
* @returns ok, or an error message when the open failed.
*/
async function openProjectInIde(facts, projectPath, editorName, editorPath) {
	const signal = new AbortController().signal;
	try {
		if (facts.platform === "win32") {
			await facts.run("cmd", [
				"/c",
				"start",
				"\"\"",
				editorPath,
				projectPath
			], signal);
			return { ok: true };
		}
		const appName = DARWIN_APP_NAMES[editorName] ?? editorName;
		await facts.run("open", [
			"-a",
			appName,
			projectPath
		], signal);
		return { ok: true };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : String(error)
		};
	}
}
//#endregion
//#region lib/types/platform/open-terminal.js
/**
* Cross-platform "open a system terminal window" actions. macOS drives
* Terminal.app through osascript (iTerm fallback when the config asks for it
* or Terminal fails); Windows prefers Windows Terminal and falls back to a
* plain cmd window. Every command goes through the no-shell runner.
* @module @liyuera/dsh-dev-dock/platform/open-terminal
*/
/** Quote one double-quoted shell fragment for embedding in AppleScript. */
function appleScriptQuote(value) {
	return `"${value.replace(/\\/g, "\\\\").replace(/"/g, "\\\"")}"`;
}
/** Build the shell command executed inside the terminal window. */
function terminalCommand(projectPath, command) {
	return command === void 0 ? `cd ${appleScriptQuote(projectPath)}` : `cd ${appleScriptQuote(projectPath)} && ${command}`;
}
/**
* Open a macOS terminal window.
* @param facts - platform facts.
* @param projectPath - absolute project path.
* @param command - optional command to run after cd.
* @param preferIterm - use iTerm instead of Terminal.app.
* @returns ok, or an error message.
*/
async function openMacTerminal(facts, projectPath, command, preferIterm) {
	const shell = terminalCommand(projectPath, command);
	const signal = new AbortController().signal;
	const app = preferIterm ? "iTerm" : "Terminal";
	const firstTry = [
		"-e",
		`tell application "${app}" to activate`,
		"-e",
		`tell application "${app}" to do script "${shell.replace(/"/g, "\\\"")}"`
	];
	try {
		await facts.run("osascript", firstTry, signal);
		return { ok: true };
	} catch (error) {
		if (preferIterm) return {
			ok: false,
			error: error instanceof Error ? error.message : String(error)
		};
	}
	try {
		await facts.run("osascript", [
			"-e",
			"tell application \"iTerm\" to activate",
			"-e",
			`tell application "iTerm" to tell current window to create tab with default profile command "${shell.replace(/"/g, "\\\"")}"`
		], signal);
		return { ok: true };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : String(error)
		};
	}
}
/**
* Open a Windows terminal window (Windows Terminal, cmd fallback).
* @param facts - platform facts.
* @param projectPath - absolute project path.
* @param command - optional command to run after cd.
* @returns ok, or an error message.
*/
async function openWinTerminal(facts, projectPath, command) {
	const signal = new AbortController().signal;
	try {
		if (command !== void 0) await facts.run("wt", [
			"-d",
			projectPath,
			"cmd",
			"/K",
			command
		], signal);
		else await facts.run("wt", ["-d", projectPath], signal);
		return { ok: true };
	} catch {}
	try {
		const args = [
			"/c",
			"start",
			"cmd",
			"/K",
			"cd",
			"/d",
			projectPath
		];
		if (command !== void 0) args.push("&&", command);
		await facts.run("cmd", args, signal);
		return { ok: true };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : String(error)
		};
	}
}
/**
* Open a system terminal window at a project directory.
* @param facts - platform facts.
* @param projectPath - absolute project path.
* @param command - optional command to run after cd.
* @param preferIterm - macOS: prefer iTerm over Terminal.app.
* @returns ok, or an error message.
*/
async function openProjectTerminal(facts, projectPath, command, preferIterm = false) {
	if (facts.platform === "win32") return openWinTerminal(facts, projectPath, command);
	return openMacTerminal(facts, projectPath, command, preferIterm);
}
//#endregion
//#region lib/types/actions.js
/**
* Host desktop actions: resolve the workspace IDE, open it, open a system
* terminal at the workspace directory, and run the batch start-work flow.
* All actions are deterministic (no agent, no approval prompt — the button
* click is the user's authorization); the only guard is the sandbox mode:
* `read-only` denies desktop side effects.
* @module @liyuera/dsh-dev-dock/actions
*/
/** Gap between consecutive IDE launches in a start-work batch. */
const IDE_LAUNCH_GAP_MS = 1200;
/** How long to wait for the editor process after its first launch. */
const IDE_LAUNCH_WAIT_MS = 2e4;
/** Poll interval while waiting for the editor process. */
const IDE_LAUNCH_POLL_MS = 400;
/** How long to settle after the editor process appears. */
const IDE_LAUNCH_SETTLE_MS = 800;
/**
* Whether a directory shows uni-app/miniapp traits (manifest.json markers).
* @param workspacePath - canonical workspace directory.
* @returns true when the traits are present.
*/
function hasUniAppTraits(workspacePath) {
	return existsSync(join(workspacePath, "manifest.json")) || existsSync(join(workspacePath, "src", "manifest.json")) || existsSync(join(workspacePath, "project.config.json"));
}
/**
* Default editor for one workspace: uni-app traits prefer HBuilderX, other
* projects prefer WebStorm, then the remaining installed editors in order.
* @param workspacePath - canonical workspace directory.
* @param installed - detected editor names.
* @returns the default editor name, or undefined when nothing is installed.
*/
function defaultEditorFor(workspacePath, installed) {
	if (installed.length === 0) return void 0;
	if (hasUniAppTraits(workspacePath)) {
		if (installed.includes("HBuilderX")) return "HBuilderX";
		return installed[0];
	}
	for (const name of PREFERRED_EDITORS) if (installed.includes(name)) return name;
	return installed[0];
}
/**
* Resolve the executable path for one editor: manual path wins, then the
* cached detected path, then a live detection pass.
* @param scope - settings scope.
* @param facts - platform facts.
* @param editorName - canonical editor name.
* @returns the resolved path or an error message.
*/
async function editorExecutablePath(scope, facts, editorName) {
	const stored = scope.get().editors.find((e) => e.name === editorName);
	if (stored?.manualPath) return {
		ok: true,
		path: stored.manualPath
	};
	if (stored?.detectedPath) return {
		ok: true,
		path: stored.detectedPath
	};
	const path = (await detectEditors(facts))[editorName];
	if (path === void 0) return {
		ok: false,
		error: `editor ${editorName} not found${editorName === "HBuilderX" ? " (configure its path in the devDock settings page)" : ""}`
	};
	return {
		ok: true,
		path
	};
}
/**
* Resolve which editor opens one workspace: the stored preference wins;
* otherwise a default is derived from the content traits and installed
* editors. The executable path is resolved from the same entry.
* @param scope - settings scope.
* @param facts - platform facts.
* @param workspace - target workspace.
* @returns editor name and executable path, or an error message.
*/
async function resolveWorkspaceEditor(scope, facts, workspace) {
	const preferred = scope.get().workspacePrefs.find((p) => p.workspaceId === workspace.id)?.editor;
	if (preferred !== void 0) {
		const resolved = await editorExecutablePath(scope, facts, preferred);
		return resolved.ok ? {
			ok: true,
			editor: preferred,
			path: resolved.path
		} : resolved;
	}
	const detected = await detectEditors(facts);
	const installed = Object.keys(detected);
	const editor = defaultEditorFor(workspace.path, installed);
	if (editor === void 0) return {
		ok: false,
		error: "no code editor detected; configure one in the devDock settings page"
	};
	const path = detected[editor];
	if (path === void 0) return {
		ok: false,
		error: `editor ${editor} detection returned no path`
	};
	return {
		ok: true,
		editor,
		path
	};
}
/**
* Open one workspace in its default editor.
* @param scope - settings scope.
* @param facts - platform facts.
* @param workspace - target workspace.
* @returns ok, or an error message.
*/
async function openIdeFor(scope, facts, workspace) {
	const resolved = await resolveWorkspaceEditor(scope, facts, workspace);
	if (!resolved.ok) return resolved;
	return openProjectInIde(facts, workspace.path, resolved.editor, resolved.path);
}
/**
* Open one workspace directory in a system terminal window.
* @param scope - settings scope.
* @param facts - platform facts.
* @param workspace - target workspace.
* @returns ok, or an error message.
*/
async function openTerminalFor(scope, facts, workspace) {
	const preferIterm = scope.get().terminalApp === "iterm";
	return openProjectTerminal(facts, workspace.path, void 0, preferIterm);
}
/**
* Run the full start action for one workspace: editor first, then terminal.
* @param scope - settings scope.
* @param facts - platform facts.
* @param workspace - target workspace.
* @returns ok, or the first error (the other half is still attempted).
*/
async function startFor(scope, facts, workspace) {
	const ide = await openIdeFor(scope, facts, workspace);
	const terminal = await openTerminalFor(scope, facts, workspace);
	if (!ide.ok) return ide;
	if (!terminal.ok) return terminal;
	return { ok: true };
}
/**
* Run the start-work batch: for each selected workspace, open its editor and
* a system terminal, with a gap between consecutive editor launches.
* @param scope - settings scope.
* @param facts - platform facts.
* @param workspaces - selected workspaces in selection order.
* @returns per-workspace results plus totals.
*/
async function startWorkFor(scope, facts, workspaces) {
	const items = [];
	let opened = 0;
	let started = 0;
	let lastEditorAppPath;
	for (const workspace of workspaces) {
		const ide = await resolveWorkspaceEditor(scope, facts, workspace);
		if (ide.ok && lastEditorAppPath !== void 0 && facts.platform === "darwin") await waitForAppProcess(facts, lastEditorAppPath);
		const ideResult = ide.ok ? await openProjectInIde(facts, workspace.path, ide.editor, ide.path) : {
			ok: false,
			error: ide.error
		};
		if (ide.ok) lastEditorAppPath = ide.path;
		const terminal = await openTerminalFor(scope, facts, workspace);
		if (ideResult.ok) opened++;
		if (terminal.ok) started++;
		const item = {
			workspaceId: workspace.id,
			ok: ideResult.ok && terminal.ok
		};
		if (!ideResult.ok) item.error = ideResult.error;
		else if (!terminal.ok) item.error = terminal.error;
		items.push(item);
		await new Promise((resolve) => setTimeout(resolve, IDE_LAUNCH_GAP_MS));
	}
	return {
		ok: items.every((item) => item.ok),
		opened,
		started,
		items
	};
}
/**
* Wait until one editor app path has a live process (bounded). LaunchServices
* hands a second `open -a <App>` to the running instance; if that instance is
* still cold, the directory event can be lost, so subsequent launches wait
* for it.
* @param facts - platform facts with the injectable runner.
* @param appPath - editor .app path launched first.
*/
async function waitForAppProcess(facts, appPath) {
	const signal = new AbortController().signal;
	const deadline = Date.now() + IDE_LAUNCH_WAIT_MS;
	while (Date.now() < deadline) {
		try {
			const { stdout } = await facts.run("pgrep", ["-f", appPath], signal);
			if (stdout.trim() !== "") {
				await new Promise((resolve) => setTimeout(resolve, IDE_LAUNCH_SETTLE_MS));
				return;
			}
		} catch {}
		await new Promise((resolve) => setTimeout(resolve, IDE_LAUNCH_POLL_MS));
	}
}
//#endregion
//#region lib/types/platform/runner.js
/**
* Host command runner facade: wraps `runNativeCommand` behind an injectable
* platform seam so platform logic is deterministically testable.
* @module @liyuera/dsh-dev-dock/platform/runner
*/
/** Default runner: no-shell execFile with utf8 capture. */
const defaultRunner = runNativeCommand;
/** Build the live platform facts. */
function liveFacts() {
	return {
		platform: process.platform,
		run: defaultRunner,
		home: process.env.HOME ?? "/tmp"
	};
}
//#endregion
//#region lib/types/index.js
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
/** Plugin identity. */
const name = "dev-dock";
/** Services required by the host half. */
const inject = ["settings", "workspaceRegistry"];
/** Guard against reading an argument that is not a JSON object. */
function asObject(value) {
	return typeof value === "object" && value !== null ? value : {};
}
/** Shared preflight for the unary actions: sandbox guard, id, path. */
function guardWorkspace(readOnly, registry, args) {
	if (readOnly) return { block: {
		ok: false,
		error: "read-only sandbox denies desktop actions"
	} };
	const workspaceId = typeof args.workspaceId === "string" ? args.workspaceId : "";
	if (registry === void 0) return { block: {
		ok: false,
		error: "workspace registry service unavailable"
	} };
	const workspace = registry.get(workspaceId);
	if (workspace === void 0) return { block: {
		ok: false,
		error: `workspace ${workspaceId || "(missing)"} not found`
	} };
	if (!existsSync(workspace.path)) return { block: {
		ok: false,
		error: `workspace directory ${workspace.path} does not exist`
	} };
	return { workspace };
}
/** Dispatch one action body; returns the JSON-serializable answer. */
async function dispatchAction(readOnly, getRegistry, devDock, facts, body) {
	const action = typeof body.action === "string" ? body.action : "";
	switch (action) {
		case "list-editors": try {
			const merged = mergeEditors(await detectEditors(facts), devDock.get().editors);
			devDock.update({ editors: merged });
			return {
				ok: true,
				editors: merged
			};
		} catch (error) {
			return {
				ok: false,
				error: error instanceof Error ? error.message : String(error)
			};
		}
		case "open-ide": {
			const guard = guardWorkspace(readOnly(), getRegistry(), asObject(body));
			if ("block" in guard) return guard.block;
			return openIdeFor(devDock, facts, guard.workspace);
		}
		case "open-terminal": {
			const guard = guardWorkspace(readOnly(), getRegistry(), asObject(body));
			if ("block" in guard) return guard.block;
			return openTerminalFor(devDock, facts, guard.workspace);
		}
		case "start": {
			const guard = guardWorkspace(readOnly(), getRegistry(), asObject(body));
			if ("block" in guard) return guard.block;
			return startFor(devDock, facts, guard.workspace);
		}
		case "start-work": {
			if (readOnly()) return {
				ok: false,
				opened: 0,
				started: 0,
				items: [],
				error: "read-only sandbox denies desktop actions"
			};
			const registry = getRegistry();
			const workspaces = (Array.isArray(body.workspaceIds) ? body.workspaceIds.filter((id) => typeof id === "string") : []).map((id) => registry?.get(id)).filter((w) => w !== void 0);
			if (workspaces.length === 0) return {
				ok: false,
				opened: 0,
				started: 0,
				items: [],
				error: "no workspaces selected"
			};
			return startWorkFor(devDock, facts, workspaces);
		}
		default: return {
			ok: false,
			error: `unknown dev-dock action ${JSON.stringify(action || "(empty)")}`
		};
	}
}
/** Write one JSON answer. */
function writeJson(res, status, value) {
	res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
	res.end(JSON.stringify(value));
}
/**
* Register the settings namespace and the action route.
* @param ctx - Cordis context carrying settings, sandboxPolicy, the
* workspace registry, and the web server.
*/
function apply(ctx) {
	const scope = ctx.settings.register(DEV_DOCK_NAMESPACE, DevDockSettingsSchema, { base: EMPTY_DEV_DOCK_SETTINGS });
	const devDock = {
		get: () => scope.get(),
		update: (patch) => scope.update(patch)
	};
	const facts = liveFacts();
	const readOnly = () => {
		return ctx.get("sandboxPolicy")?.resolve().mode === "read-only";
	};
	const getRegistry = () => ctx.get("workspaceRegistry");
	const webServer = ctx.get("webServer");
	if (webServer === void 0) return;
	ctx.effect(() => webServer.register({
		kind: "exact",
		path: "/dev-dock/action",
		handler: async (req, res) => {
			if (req.method !== "POST") {
				writeJson(res, 405, {
					ok: false,
					error: "method not allowed"
				});
				return;
			}
			const chunks = [];
			for await (const chunk of req) chunks.push(chunk);
			let body;
			try {
				body = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
			} catch {
				writeJson(res, 400, {
					ok: false,
					error: "invalid JSON body"
				});
				return;
			}
			try {
				writeJson(res, 200, await dispatchAction(readOnly, getRegistry, devDock, facts, body));
			} catch (error) {
				writeJson(res, 200, {
					ok: false,
					error: error instanceof Error ? error.message : String(error)
				});
			}
		}
	}), "dev-dock: action route");
	ctx.effect(() => webServer.register({
		kind: "exact",
		path: "/dev-dock/editor-icon",
		handler: async (req, res) => {
			if (req.method !== "GET") {
				writeJson(res, 405, {
					ok: false,
					error: "method not allowed"
				});
				return;
			}
			const editor = new URL(req.url ?? "/", "http://dsh.internal").searchParams.get("editor") ?? "";
			const entry = devDock.get().editors.find((e) => e.name === editor);
			const appPath = entry?.manualPath || entry?.detectedPath;
			if (entry === void 0 || appPath === void 0 || !existsSync(appPath)) {
				writeJson(res, 404, {
					ok: false,
					error: `editor ${editor} has no resolvable app path`
				});
				return;
			}
			try {
				const png = await renderAppIconPng(facts, appPath);
				res.writeHead(200, {
					"content-type": "image/png",
					"cache-control": "no-store"
				});
				res.end(png);
			} catch (error) {
				writeJson(res, 404, {
					ok: false,
					error: error instanceof Error ? error.message : String(error)
				});
			}
		}
	}), "dev-dock: editor-icon route");
	ctx.effect(() => webServer.register({
		kind: "exact",
		path: "/dev-dock/workspace-editor-icon",
		handler: async (req, res) => {
			if (req.method !== "GET") {
				writeJson(res, 405, {
					ok: false,
					error: "method not allowed"
				});
				return;
			}
			const workspaceId = new URL(req.url ?? "/", "http://dsh.internal").searchParams.get("workspaceId") ?? "";
			const workspace = getRegistry()?.get(workspaceId);
			if (workspace === void 0 || !existsSync(workspace.path)) {
				writeJson(res, 404, {
					ok: false,
					error: `workspace ${workspaceId || "(missing)"} not found`
				});
				return;
			}
			const resolved = await resolveWorkspaceEditor(devDock, facts, workspace);
			if (!resolved.ok) {
				writeJson(res, 404, {
					ok: false,
					error: resolved.error
				});
				return;
			}
			try {
				const png = await renderAppIconPng(facts, resolved.path);
				res.writeHead(200, {
					"content-type": "image/png",
					"cache-control": "no-store"
				});
				res.end(png);
			} catch (error) {
				writeJson(res, 404, {
					ok: false,
					error: error instanceof Error ? error.message : String(error)
				});
			}
		}
	}), "dev-dock: workspace-editor-icon route");
	ctx.effect(() => webServer.register({
		kind: "exact",
		path: "/dev-dock/terminal-icon",
		handler: async (req, res) => {
			if (req.method !== "GET") {
				writeJson(res, 405, {
					ok: false,
					error: "method not allowed"
				});
				return;
			}
			const app = new URL(req.url ?? "/", "http://dsh.internal").searchParams.get("app") === "iterm" ? "iterm" : "default";
			const appPath = await resolveTerminalAppPath(facts, app);
			if (appPath === void 0) {
				writeJson(res, 404, {
					ok: false,
					error: `terminal ${app} not found`
				});
				return;
			}
			try {
				const png = await renderAppIconPng(facts, appPath);
				res.writeHead(200, {
					"content-type": "image/png",
					"cache-control": "no-store"
				});
				res.end(png);
			} catch (error) {
				writeJson(res, 404, {
					ok: false,
					error: error instanceof Error ? error.message : String(error)
				});
			}
		}
	}), "dev-dock: terminal-icon route");
}
/** Terminal app bundle path preference: 'iterm' or the macOS default. */
async function resolveTerminalAppPath(facts, app) {
	if (app === "default") return existsSync("/System/Applications/Utilities/Terminal.app") ? "/System/Applications/Utilities/Terminal.app" : void 0;
	for (const candidate of ["/Applications/iTerm.app", "/Applications/iTerm2.app"]) if (existsSync(candidate)) return candidate;
	return detectDarwinApp(facts, "iTerm.app");
}
/** Icon cache: one rendered PNG per editor app path. */
const ICON_CACHE = /* @__PURE__ */ new Map();
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
	if (cached !== void 0) return cached;
	if (facts.platform !== "darwin") throw new Error("editor icons are macOS-only");
	const resources = join(appPath, "Contents", "Resources");
	const signal = new AbortController().signal;
	let iconBase = "";
	try {
		const { stdout } = await facts.run("plutil", [
			"-extract",
			"CFBundleIconFile",
			"raw",
			"-o",
			"-",
			join(appPath, "Contents", "Info.plist")
		], signal);
		const name = stdout.trim();
		if (name !== "") iconBase = name.toLowerCase().endsWith(".icns") ? name.slice(0, -5) : name;
	} catch {}
	const icnsCandidates = [];
	if (iconBase !== "") icnsCandidates.push(join(resources, `${iconBase}.icns`));
	const appBase = basename(appPath, ".app");
	const conventional = [
		"icon.icns",
		`${appBase}.icns`,
		"AppIcon.icns"
	];
	for (const name of conventional) icnsCandidates.push(join(resources, name));
	for (const icnsPath of icnsCandidates) {
		if (!existsSync(icnsPath)) continue;
		const dir = mkdtempSync(join(tmpdir(), "devdock-icon-"));
		try {
			const outPath = join(dir, "icon.png");
			await facts.run("sips", [
				"-s",
				"format",
				"png",
				"-z",
				"128",
				"128",
				icnsPath,
				"--out",
				outPath
			], signal);
			if (!existsSync(outPath)) continue;
			const bytes = readFileSync(outPath);
			ICON_CACHE.set(appPath, bytes);
			return bytes;
		} finally {
			rmSync(dir, {
				recursive: true,
				force: true
			});
		}
	}
	const iconset = join(resources, `${iconBase === "" ? appBase : iconBase}.iconset`);
	for (const name of [
		"icon_512x512@2x.png",
		"icon_256x256@2x.png",
		"icon_512x512.png",
		"icon_128x128@2x.png",
		"icon_256x256.png",
		"icon_128x128.png"
	]) {
		const pngPath = join(iconset, name);
		if (existsSync(pngPath)) {
			const bytes = readFileSync(pngPath);
			ICON_CACHE.set(appPath, bytes);
			return bytes;
		}
	}
	const quicklook = await tryQuickLookPng(facts, appPath);
	if (quicklook !== void 0) {
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
	const dir = mkdtempSync(join(tmpdir(), "devdock-ql-"));
	try {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), 8e3);
		try {
			await facts.run("qlmanage", [
				"-t",
				"-s",
				"128",
				"-o",
				dir,
				appPath
			], controller.signal);
		} finally {
			clearTimeout(timer);
		}
		const pngPath = join(dir, `${basename(appPath)}.png`);
		if (!existsSync(pngPath)) return void 0;
		return readFileSync(pngPath);
	} catch {
		return;
	} finally {
		rmSync(dir, {
			recursive: true,
			force: true
		});
	}
}
//#endregion
export { apply, inject, name };
