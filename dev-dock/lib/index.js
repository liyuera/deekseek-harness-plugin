import z from "@deepseek-ai/schemastery";
import { settingsNamespace } from "@deepseek-ai/dsh-settings";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { effectiveApprovalPolicy } from "@deepseek-ai/dsh-user-approval";
import { runNativeCommand } from "@deepseek-ai/dsh-native-command";
//#region lib/types/schema.js
/**
* devDock settings namespace: project registry, editor configuration, and
* quick-start plans. Persisted through the settings capability
* (`$DSH_HOME/settings.yaml`, namespace `dev-dock`).
* @module @liyuera/dsh-dev-dock/schema
*/
/** Branded settings namespace of this plugin. */
const DEV_DOCK_NAMESPACE = settingsNamespace("dev-dock");
/** Schemastery schema for the whole document (registered by the host half). */
const DevDockSettingsSchema = z.object({
	projects: z.array(z.object({
		id: z.string().required(),
		name: z.string().required(),
		path: z.string().required(),
		alias: z.string(),
		type: z.union([
			z.const("node"),
			z.const("uniapp"),
			z.const("miniapp")
		]).required(),
		packageManager: z.union([
			z.const("npm"),
			z.const("pnpm"),
			z.const("yarn")
		]).required(),
		nodeVersion: z.string(),
		scripts: z.dict(z.string()).required(),
		buildCommand: z.string(),
		createdAt: z.string().required()
	})).default([]),
	editors: z.array(z.object({
		name: z.string().required(),
		detectedPath: z.string(),
		manualPath: z.string()
	})).default([]),
	quickStarts: z.array(z.object({
		name: z.string().required(),
		items: z.array(z.object({
			projectId: z.string().required(),
			ides: z.array(z.string()).required(),
			script: z.string()
		})).required()
	})).default([]),
	terminalApp: z.union([z.const("default"), z.const("iterm")]).default("default")
});
/** Empty settings document used as the schema base. */
const EMPTY_DEV_DOCK_SETTINGS = {
	projects: [],
	editors: [],
	quickStarts: [],
	terminalApp: "default"
};
//#endregion
//#region lib/types/tools/scan.js
/**
* Deterministic directory scan for frontend project candidates. The tool
* returns raw signals only — the AI decides which candidates are frontend
* projects and what their environment is.
* @module @liyuera/dsh-dev-dock/tools/scan
*/
/** Lock-file names mapped to package managers. */
const LOCK_TO_MANAGER = [
	["pnpm-lock.yaml", "pnpm"],
	["yarn.lock", "yarn"],
	["package-lock.json", "npm"],
	["bun.lockb", "bun"]
];
/** Directory names never treated as project candidates. */
const SKIP_NAMES = new Set([
	"node_modules",
	".git",
	"dist",
	"build",
	"out",
	"coverage",
	".idea",
	".vscode",
	".DS_Store",
	"unpackage",
	"uni_modules",
	"miniprogram_npm",
	"assets",
	"static"
]);
/**
* Read package.json of one candidate; tolerant of missing or malformed files.
* @param dir - candidate directory.
* @returns parsed package.json or null.
*/
function readPackageJson(dir) {
	const pkgPath = join(dir, "package.json");
	if (!existsSync(pkgPath)) return null;
	try {
		const parsed = JSON.parse(readFileSync(pkgPath, "utf-8"));
		return parsed && typeof parsed === "object" ? parsed : null;
	} catch {
		return null;
	}
}
/**
* Collect signals for one candidate directory.
* @param dir - absolute candidate directory.
* @returns candidate signals.
*/
function collectSignals(dir) {
	const pkg = readPackageJson(dir);
	const hasPackageJson = existsSync(join(dir, "package.json"));
	const scripts = pkg?.scripts !== null && typeof pkg?.scripts === "object" ? pkg.scripts : {};
	const deps = {
		...pkg?.dependencies !== null && typeof pkg?.dependencies === "object" ? pkg.dependencies : {},
		...pkg?.devDependencies !== null && typeof pkg?.devDependencies === "object" ? pkg.devDependencies : {}
	};
	const hasManifest = existsSync(join(dir, "manifest.json")) || existsSync(join(dir, "src", "manifest.json"));
	const hasMiniappConfig = existsSync(join(dir, "project.config.json")) || existsSync(join(dir, "miniprogramRoot"));
	const lock = LOCK_TO_MANAGER.find(([file]) => existsSync(join(dir, file)))?.[0];
	const nodeVersionFile = existsSync(join(dir, ".nvmrc")) || existsSync(join(dir, ".node-version"));
	const signals = {
		path: dir,
		name: basename(dir),
		hasPackageJson,
		hasManifest,
		hasMiniappConfig,
		hasNodeVersionFile: nodeVersionFile,
		dependencies: Object.keys(deps),
		scriptNames: Object.keys(scripts)
	};
	if (lock !== void 0) signals.lockFile = lock;
	if (typeof pkg?.description === "string") signals.description = pkg.description;
	return signals;
}
/**
* Scan one directory: the directory itself plus its direct children.
* @param root - absolute directory to scan.
* @returns candidate signals for the root and each direct subdirectory.
*/
function scanCandidates(root) {
	const results = [];
	const push = (dir) => {
		try {
			if (statSync(dir).isDirectory()) results.push(collectSignals(dir));
		} catch {}
	};
	push(root);
	let entries = [];
	try {
		entries = readdirSync(root);
	} catch {
		return results;
	}
	for (const entry of entries) {
		if (entry.startsWith(".") || SKIP_NAMES.has(entry)) continue;
		push(join(root, entry));
	}
	return results;
}
/** Model-facing tool: scan one directory for frontend project candidates. */
const scanCandidatesTool = defineTool({
	name: "dev-dock_scan-candidates",
	description: "Scan a directory for frontend project candidates. Returns the directory itself and its direct subdirectories with raw signals: presence of package.json / manifest.json / miniapp config, lock file, node version file, key dependencies, and script names. Use the signals to judge which candidates are frontend projects and analyze their environment, then save them with dev-dock_save-project.",
	parameters: { dir: {
		type: "string",
		required: true,
		description: "Absolute directory path to scan"
	} },
	output: {
		schema: {
			type: "object",
			additionalProperties: false,
			properties: {
				root: {
					type: "string",
					required: true
				},
				candidates: {
					type: "array",
					required: true,
					items: {
						type: "object",
						additionalProperties: false,
						properties: {
							path: {
								type: "string",
								required: true
							},
							name: {
								type: "string",
								required: true
							},
							hasPackageJson: {
								type: "boolean",
								required: true
							},
							hasManifest: {
								type: "boolean",
								required: true
							},
							hasMiniappConfig: {
								type: "boolean",
								required: true
							},
							lockFile: { type: "string" },
							hasNodeVersionFile: {
								type: "boolean",
								required: true
							},
							dependencies: {
								type: "array",
								required: true,
								items: { type: "string" }
							},
							scriptNames: {
								type: "array",
								required: true,
								items: { type: "string" }
							},
							description: { type: "string" }
						}
					}
				}
			}
		},
		render: (_args, value) => [{
			type: "text",
			text: formatCandidates(value)
		}]
	},
	async execute(args) {
		if (args.dir.trim().length === 0) throw new Error("invalid dir: expected a non-empty string");
		const candidates = scanCandidates(args.dir);
		return {
			root: args.dir,
			candidates
		};
	}
});
/** Human-readable candidate listing for the model result. */
function formatCandidates(value) {
	const lines = value.candidates.map((c) => {
		const markers = [];
		if (c.hasPackageJson) markers.push("package.json");
		if (c.hasManifest) markers.push("manifest.json");
		if (c.hasMiniappConfig) markers.push("miniapp");
		if (c.lockFile) markers.push(c.lockFile);
		if (c.hasNodeVersionFile) markers.push("node-version");
		const deps = c.dependencies.length > 0 ? ` deps: ${c.dependencies.slice(0, 12).join(",")}` : "";
		const scripts = c.scriptNames.length > 0 ? ` scripts: ${c.scriptNames.slice(0, 10).join(",")}` : "";
		return `${c.path} [${markers.join(",") || "no project markers"}${deps}${scripts}]`;
	});
	return [`Scanned ${value.candidates.length} candidate(s) under ${value.root}:`, ...lines].join("\n");
}
//#endregion
//#region lib/types/tools/project.js
/**
* Project registry tools: save (upsert), list, remove. All mutations go
* through the plugin's settings namespace scope.
* @module @liyuera/dsh-dev-dock/tools/project
*/
/** Wrap a live settings scope behind the tool facade. */
function scopeOf(scope) {
	return {
		get: () => scope.get(),
		update: (patch) => scope.update(patch)
	};
}
/**
* Mint the next project id (max numeric id + 1, or "1").
* @param projects - current project list.
* @returns the next id.
*/
function nextProjectId(projects) {
	let max = 0;
	for (const p of projects) {
		const n = Number(p.id);
		if (Number.isInteger(n) && n > max) max = n;
	}
	return String(max + 1);
}
/**
* Upsert one project: same path keeps its id and createdAt (update overwrite).
* @param current - current document.
* @param project - candidate project record (id may be empty on insert).
* @returns the new document and the stored record.
*/
function upsertProject(current, project) {
	const existing = current.projects.find((p) => p.path === project.path);
	const stored = {
		...project,
		id: existing?.id ?? project.id ?? nextProjectId(current.projects),
		createdAt: existing?.createdAt ?? (/* @__PURE__ */ new Date()).toISOString()
	};
	const projects = existing ? current.projects.map((p) => p.path === project.path ? stored : p) : [...current.projects, stored];
	return {
		next: {
			...current,
			projects
		},
		stored
	};
}
/**
* Remove one project and cascade-clean its quick-start references.
* @param current - current document.
* @param projectId - project id to remove.
* @returns the new document; false when the id did not exist.
*/
function removeProject(current, projectId) {
	const projects = current.projects.filter((p) => p.id !== projectId);
	if (projects.length === current.projects.length) return null;
	const quickStarts = current.quickStarts.map((plan) => ({
		...plan,
		items: plan.items.filter((item) => item.projectId !== projectId)
	})).filter((plan) => plan.items.length > 0);
	return { next: {
		...current,
		projects,
		quickStarts
	} };
}
/** Tool: save one analyzed project (insert or update overwrite). */
function saveProjectTool(scope) {
	return defineTool({
		name: "dev-dock_save-project",
		description: "Save one analyzed frontend project into the devDock registry. Insert when the path is new; update overwrite when it already exists (keeps its id and createdAt). Call once per candidate after the AI analysis judged it a frontend project.",
		parameters: {
			path: {
				type: "string",
				required: true,
				description: "Absolute project path"
			},
			name: {
				type: "string",
				required: true,
				description: "Project directory name"
			},
			type: {
				type: "string",
				required: true,
				description: "Project kind: node, uniapp, or miniapp"
			},
			packageManager: {
				type: "string",
				required: true,
				description: "Package manager: npm, pnpm, or yarn"
			},
			scripts: {
				type: "object",
				additionalProperties: true,
				description: "package.json scripts (name to command)"
			},
			nodeVersion: {
				type: "string",
				description: "Node version requirement (e.g. \"18\")"
			},
			buildCommand: {
				type: "string",
				description: "Build script name, e.g. \"build\""
			},
			alias: {
				type: "string",
				description: "Optional display alias"
			}
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: {
					id: {
						type: "string",
						required: true
					},
					path: {
						type: "string",
						required: true
					}
				}
			},
			render: (_args, value) => [{
				type: "text",
				text: `saved project ${value.id} at ${value.path}`
			}]
		},
		async execute(args) {
			const current = scope.get();
			const record = {
				path: args.path,
				name: args.name,
				type: args.type,
				packageManager: args.packageManager,
				scripts: args.scripts ?? {}
			};
			if (args.nodeVersion !== void 0) record.nodeVersion = args.nodeVersion;
			if (args.buildCommand !== void 0) record.buildCommand = args.buildCommand;
			if (args.alias !== void 0) record.alias = args.alias;
			const result = upsertProject(current, record);
			scope.update({ projects: result.next.projects });
			return {
				id: result.stored.id,
				path: result.stored.path
			};
		}
	});
}
/** Tool: list all registered projects. */
function listProjectsTool(scope) {
	return defineTool({
		name: "dev-dock_list-projects",
		description: "List all projects registered in the devDock registry: id, name, path, type, package manager, node version, scripts, build command, alias.",
		parameters: {},
		output: {
			schema: {
				type: "array",
				items: {
					type: "object",
					additionalProperties: false,
					properties: {
						id: {
							type: "string",
							required: true
						},
						name: {
							type: "string",
							required: true
						},
						path: {
							type: "string",
							required: true
						},
						alias: { type: "string" },
						type: {
							type: "string",
							required: true
						},
						packageManager: {
							type: "string",
							required: true
						},
						nodeVersion: { type: "string" },
						scripts: {
							type: "object",
							additionalProperties: true,
							required: true
						},
						buildCommand: { type: "string" },
						createdAt: {
							type: "string",
							required: true
						}
					}
				}
			},
			render: (_args, value) => [{
				type: "text",
				text: formatProjectList(value)
			}]
		},
		async execute() {
			return scope.get().projects;
		}
	});
}
/** Tool: remove one project from the registry (cascades quick-start references). */
function removeProjectTool(scope) {
	return defineTool({
		name: "dev-dock_remove-project",
		description: "Remove one project from the devDock registry. Only removes the plugin-managed configuration; never touches files on disk. Also removes the project from every quick-start plan.",
		parameters: { projectId: {
			type: "string",
			required: true,
			description: "Project id from dev-dock_list-projects"
		} },
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: {
					removed: {
						type: "boolean",
						required: true
					},
					id: {
						type: "string",
						required: true
					}
				}
			},
			render: (_args, value) => [{
				type: "text",
				text: value.removed ? `removed project ${value.id}` : `project ${value.id} not found`
			}]
		},
		async execute(args) {
			const result = removeProject(scope.get(), args.projectId);
			if (result === null) return {
				removed: false,
				id: args.projectId
			};
			scope.update({
				projects: result.next.projects,
				quickStarts: result.next.quickStarts
			});
			return {
				removed: true,
				id: args.projectId
			};
		}
	});
}
/** Human-readable project listing for the model result. */
function formatProjectList(projects) {
	if (projects.length === 0) return "No projects registered.";
	return projects.map((p) => {
		const record = p;
		const scripts = Object.keys(record.scripts ?? {});
		return `${record.id}\t${record.name}\t${record.type}\t${record.packageManager}\t${record.path}\tscripts: ${scripts.join(",") || "-"}`;
	}).join("\n");
}
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
//#region lib/types/tools/editors.js
/**
* Editor detection tool: merges live auto-detection with user-configured
* paths from settings, and persists detected paths back for the UI.
* @module @liyuera/dsh-dev-dock/tools/editors
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
* Merge detected paths with manual configuration: detected wins unless a
* manual path exists (manual overrides detection for the same editor).
* @param detected - live detection result.
* @param stored - editors from settings.
* @returns merged editor records, persisted order kept, new names appended.
*/
function mergeEditors(detected, stored) {
	const byName = new Map(stored.map((e) => [e.name, { ...e }]));
	for (const name of KNOWN_EDITORS) {
		const current = byName.get(name);
		const detectedPath = detected[name];
		if (current !== void 0) if (detectedPath !== void 0) current.detectedPath = detectedPath;
		else delete current.detectedPath;
		else {
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
/** Tool: detect installed editors and merge user configuration. */
function listEditorsTool(scope, facts) {
	return defineTool({
		name: "dev-dock_list-editors",
		description: "Detect code editors installed on this machine (WebStorm, VS Code, IntelliJ IDEA, Cursor, Sublime Text, HBuilderX) and merge user-configured paths. Returns each editor with its detected path and/or manual path.",
		parameters: {},
		output: {
			schema: {
				type: "array",
				items: {
					type: "object",
					additionalProperties: false,
					properties: {
						name: {
							type: "string",
							required: true
						},
						detectedPath: { type: "string" },
						manualPath: { type: "string" }
					}
				}
			},
			render: (_args, value) => [{
				type: "text",
				text: formatEditors(value)
			}]
		},
		async execute() {
			const merged = mergeEditors(await detectEditors(facts), scope.get().editors);
			scope.update({ editors: merged });
			return merged;
		}
	});
}
/** Human-readable editor listing for the model result. */
function formatEditors(editors) {
	if (editors.length === 0) return "No editors detected or configured.";
	return editors.map((e) => {
		const parts = [e.name];
		if (e.detectedPath) parts.push(`detected: ${e.detectedPath}`);
		if (e.manualPath) parts.push(`manual: ${e.manualPath}`);
		if (!e.detectedPath && !e.manualPath) parts.push("(not installed)");
		return parts.join("	");
	}).join("\n");
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
//#region lib/types/tools/actions.js
/**
* Desktop action tools: open a project in an IDE, open a system terminal at
* a project (optionally running one script), and run a quick-start plan.
* All three are user-visible desktop side effects and follow the approval
* pipeline: `never` policy executes directly, `ask` goes through
* `ctx.approval.request` with one consolidated question per tool call.
* @module @liyuera/dsh-dev-dock/tools/actions
*/
/** Delay between consecutive IDE launches in a quick-start run. */
const IDE_LAUNCH_GAP_MS = 300;
/**
* Decide whether one desktop action may run: the session's effective
* approval policy, asking through the approval service when the policy is
* `ask`. The `never` policy never asks — full access executes directly.
* @param approval - the approval service.
* @param exec - the live tool execution carrying the agent.
* @param toolName - tool identity for the audit pair.
* @param reason - user-facing explanation of the action.
* @returns true when the action is allowed.
*/
async function requireApproval(approval, exec, toolName, reason) {
	const agent = exec.agent;
	if (agent === void 0) return {
		allowed: false,
		error: "no agent context for approval"
	};
	if (effectiveApprovalPolicy(agent.session.events) === "never") return { allowed: true };
	const outcome = await approval.request({
		agent,
		toolName,
		reason,
		signal: exec.signal
	});
	if (outcome === "allowed-once") return { allowed: true };
	return {
		allowed: false,
		error: `approval rejected (${outcome})`
	};
}
/**
* Resolve the executable path for one editor: manual path wins, then
* detected path, then a live detection pass.
* @param scope - settings scope.
* @param facts - platform facts.
* @param editorName - canonical editor name.
* @returns the resolved path or an error message.
*/
async function resolveEditorPath(scope, facts, editorName) {
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
		error: `editor ${editorName} not found${editorName === "HBuilderX" ? " (configure its path in the devDock panel settings)" : ""}`
	};
	return {
		ok: true,
		path
	};
}
/** Default editor per project kind. */
function defaultEditorFor(type) {
	return type === "uniapp" || type === "miniapp" ? "HBuilderX" : "WebStorm";
}
/** Tool: open one project in an IDE. */
function openIdeTool(scope, facts, approval) {
	return defineTool({
		name: "dev-dock_open-ide",
		description: "Open one registered project in a code editor on the user's desktop (WebStorm, VS Code, IntelliJ IDEA, Cursor, Sublime Text, or HBuilderX). Defaults to the project-kind editor (HBuilderX for uni-app/miniapp, WebStorm otherwise). This opens a visible application window — the user may be asked to approve.",
		parameters: {
			projectId: {
				type: "string",
				required: true,
				description: "Project id from dev-dock_list-projects"
			},
			editor: {
				type: "string",
				description: "Editor name to use; defaults to the project-kind editor"
			}
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: {
					ok: {
						type: "boolean",
						required: true
					},
					error: { type: "string" }
				}
			},
			render: (_args, value) => [{
				type: "text",
				text: value.ok ? "IDE opened" : `failed: ${value.error ?? "unknown error"}`
			}]
		},
		async execute(args, exec) {
			const project = scope.get().projects.find((p) => p.id === args.projectId);
			if (project === void 0) return {
				ok: false,
				error: `project ${args.projectId} not found`
			};
			const editor = args.editor ?? defaultEditorFor(project.type);
			const allowed = await requireApproval(approval, exec, "dev-dock_open-ide", `Open ${project.name} in ${editor}`);
			if (!allowed.allowed) return {
				ok: false,
				error: allowed.error
			};
			const resolved = await resolveEditorPath(scope, facts, editor);
			if (!resolved.ok) return {
				ok: false,
				error: resolved.error
			};
			const result = await openProjectInIde(facts, project.path, editor, resolved.path);
			return result.ok ? { ok: true } : {
				ok: false,
				error: result.error
			};
		}
	});
}
/** Tool: open a system terminal at a project, optionally running one script. */
function openTerminalTool(scope, facts, approval) {
	return defineTool({
		name: "dev-dock_open-terminal",
		description: "Open a system terminal window (Terminal.app/iTerm on macOS, Windows Terminal/cmd on Windows) at a registered project directory, optionally running one of its scripts with the project's package manager (e.g. `pnpm run dev`). The command runs in a user-visible terminal window — the user may be asked to approve.",
		parameters: {
			projectId: {
				type: "string",
				required: true,
				description: "Project id from dev-dock_list-projects"
			},
			command: {
				type: "string",
				description: "Optional script name from the project scripts to run"
			}
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: {
					ok: {
						type: "boolean",
						required: true
					},
					error: { type: "string" }
				}
			},
			render: (_args, value) => [{
				type: "text",
				text: value.ok ? "terminal opened" : `failed: ${value.error ?? "unknown error"}`
			}]
		},
		async execute(args, exec) {
			const project = scope.get().projects.find((p) => p.id === args.projectId);
			if (project === void 0) return {
				ok: false,
				error: `project ${args.projectId} not found`
			};
			let command;
			if (args.command !== void 0) {
				if (!(args.command in project.scripts)) return {
					ok: false,
					error: `script ${args.command} not found in project scripts`
				};
				command = `${project.packageManager} run ${args.command}`;
			}
			const allowed = await requireApproval(approval, exec, "dev-dock_open-terminal", `Open terminal at ${project.name}${command === void 0 ? "" : ` and run ${command}`}`);
			if (!allowed.allowed) return {
				ok: false,
				error: allowed.error
			};
			const preferIterm = scope.get().terminalApp === "iterm";
			const result = await openProjectTerminal(facts, project.path, command, preferIterm);
			return result.ok ? { ok: true } : {
				ok: false,
				error: result.error
			};
		}
	});
}
/** Tool: run one quick-start plan (batch open IDEs + start scripts). */
function quickStartTool(scope, facts, approval) {
	return defineTool({
		name: "dev-dock_quick-start",
		description: "Run a quick-start plan: for each item, open the project in its chosen editors and start its script in a system terminal. One approval covers the whole plan. Plan defaults to the first saved plan when none is named.",
		parameters: { plan: {
			type: "string",
			description: "Quick-start plan name; defaults to the first plan"
		} },
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: {
					ok: {
						type: "boolean",
						required: true
					},
					opened: {
						type: "number",
						required: true
					},
					started: {
						type: "number",
						required: true
					},
					error: { type: "string" }
				}
			},
			render: (_args, value) => [{
				type: "text",
				text: value.ok ? `quick-start done: ${value.opened} IDE open(s), ${value.started} script(s) started` : `quick-start failed: ${value.error ?? "unknown error"}`
			}]
		},
		async execute(args, exec) {
			const plans = scope.get().quickStarts;
			const plan = plans.find((p) => p.name === args.plan) ?? plans[0];
			if (plan === void 0) return {
				ok: false,
				error: "no quick-start plan saved",
				opened: 0,
				started: 0
			};
			const projects = new Map(scope.get().projects.map((p) => [p.id, p]));
			const summary = plan.items.map((item) => {
				const project = projects.get(item.projectId);
				return `${project === void 0 ? item.projectId : project.name}${item.ides.length > 0 ? ` IDE:${item.ides.join("+")}` : ""}${item.script !== void 0 ? ` script:${item.script}` : ""}`;
			}).join("; ");
			const allowed = await requireApproval(approval, exec, "dev-dock_quick-start", `Quick-start "${plan.name}": ${plan.items.length} item(s) — ${summary}`);
			if (!allowed.allowed) return {
				ok: false,
				error: allowed.error,
				opened: 0,
				started: 0
			};
			const preferIterm = scope.get().terminalApp === "iterm";
			let opened = 0;
			let started = 0;
			const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
			for (const item of plan.items) {
				const project = projects.get(item.projectId);
				if (project === void 0) continue;
				for (const editor of item.ides) {
					const resolved = await resolveEditorPath(scope, facts, editor);
					if (resolved.ok) {
						if ((await openProjectInIde(facts, project.path, editor, resolved.path)).ok) opened++;
					}
					await sleep(IDE_LAUNCH_GAP_MS);
				}
				if (item.script !== void 0 && item.script in project.scripts) {
					const command = `${project.packageManager} run ${item.script}`;
					if ((await openProjectTerminal(facts, project.path, command, preferIterm)).ok) started++;
				}
			}
			return {
				ok: true,
				opened,
				started
			};
		}
	});
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
* devDock plugin, node half. Registers the `dev-dock` settings namespace and
* the tool set: candidate scanning, project save/list/remove, editor
* detection, and the desktop actions (open IDE / system terminal /
* quick-start) behind the approval pipeline.
* @module @liyuera/dsh-dev-dock
*/
/** Plugin identity. */
const name = "dev-dock";
/** Services required by the host half. */
const inject = [
	"tools",
	"settings",
	"approval"
];
/**
* Register the settings namespace and all tools.
* @param ctx - Cordis context carrying tools, settings, and approval.
*/
function apply(ctx) {
	const devDock = scopeOf(ctx.settings.register(DEV_DOCK_NAMESPACE, DevDockSettingsSchema, { base: EMPTY_DEV_DOCK_SETTINGS }));
	const facts = liveFacts();
	ctx.tools.register(scanCandidatesTool);
	ctx.tools.register(saveProjectTool(devDock));
	ctx.tools.register(listProjectsTool(devDock));
	ctx.tools.register(removeProjectTool(devDock));
	ctx.tools.register(listEditorsTool(devDock, facts));
	ctx.tools.register(openIdeTool(devDock, facts, ctx.approval));
	ctx.tools.register(openTerminalTool(devDock, facts, ctx.approval));
	ctx.tools.register(quickStartTool(devDock, facts, ctx.approval));
}
//#endregion
export { apply, inject, name };
