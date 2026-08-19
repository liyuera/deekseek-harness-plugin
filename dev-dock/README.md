# @liyuera/dsh-dev-dock

Frontend project engineering management for DeepSeek Harness: a project registry (scanned and analyzed by the agent), code editor detection, quick-start plans, and desktop actions that open projects in an IDE or a system terminal window. The desktop actions run in **user-visible** windows — never in dsh's internal terminal — and follow the approval pipeline.

## Install

```sh
dsh plugin --profile web add link:/Users/liyu/Documents/www/DeepSeek/deepseek-harness/deekseek-harness-plugin/dev-dock
```

Restart `dsh web`. A `devDock` entry appears above Settings in the sidebar; it opens the panel drawer (projects / quick-start / import).

## Host half: tools

The node half registers the `dev-dock` settings namespace and eight tools:

| Tool | Purpose |
|---|---|
| `dev-dock_scan-candidates` | Deterministic directory scan returning raw candidate signals (package.json / manifest.json / lock file / deps / scripts). The AI judges which candidates are frontend projects. |
| `dev-dock_save-project` | Upsert one analyzed project (path is the unique key; update overwrite keeps id and createdAt). |
| `dev-dock_list-projects` | List the registry. |
| `dev-dock_remove-project` | Remove one project; cascades quick-start references. Never touches disk. |
| `dev-dock_list-editors` | Detect installed editors (WebStorm / VS Code / IntelliJ IDEA / Cursor / Sublime Text / HBuilderX) and merge user-configured paths. |
| `dev-dock_open-ide` | Open one project in an editor on the desktop. Approval-gated. |
| `dev-dock_open-terminal` | Open a system terminal window at the project, optionally running one script with the project's package manager. Approval-gated. |
| `dev-dock_quick-start` | Run a named quick-start plan: open each item's editors and start its script in system terminals. One approval covers the whole plan. |

The three action tools ask through `ctx.approval` when the session's effective policy is `ask`; the `never` policy (full access) executes directly.

## Browser half: UI

The browser half contributes two entries:

- `sidebar.footer.action` — the full-width `devDock` row above Settings, showing the registered project count; opens the drawer.
- `shell.overlay` — the right-docked drawer with three pages: **Projects** (list with terminal/IDE/remove actions), **Quick Start** (edit named plans: multi-select editors + one script per project, save and launch), and **Import** (enter a directory; the agent scans, analyzes, lists candidates for confirmation, and saves them).

Data flows through the plugin's settings namespace (`dev-dock`) via `ctx.settingsScope.bind`; UI mutations use the scope's field writes and the `settings/document-updated` forwarded event. Agent-facing actions are queued through the current session's prompt so the approval pipeline and tool cards apply.

## Configuration

- `scanDirs` — not used; the agent passes directories to `dev-dock_scan-candidates` explicitly.
- `terminalApp: 'default' | 'iterm'` — macOS terminal preference (Terminal.app vs iTerm).
- `editors[].manualPath` — user-configured editor path (HBuilderX relies on this).
- `quickStarts[]` — named plans with `items: [{ projectId, ides[], script? }]`.

## Model Experience

### Request context and condition

#### What the model sees

Eight tool schemas (names, descriptions, parameters) plus the tools' rendered results. The tool descriptions are the verbatim contract shown above; they pin the workflow: scan candidates → judge frontend projects → save → confirm the save list with the user.

##### Verbatim text for this field

The descriptions in the [tool table](#host-half-tools) are copied verbatim from source; they are the model-facing contract.

#### Token effect

Fixed: eight tool schemas join the system-prompt assembly while the plugin is mounted; each call contributes its arguments and a rendered result line. No conditional context.

#### KV Cache effect

Prefix-stable: tool schemas do not change at runtime; result lines append after the cached prefix. The `dev-dock_list-editors` result can change with the machine's installed editors, but only as ordinary result text.

## Known Limitations and Deferred Work

- **Single-package host+browser compile** — the plugin compiles both halves in one TypeScript program; the host half's `dsh-user-approval` → `dsh-session` chain shadows the browser `Context.sessions` ISessions face, so `src/client/api.ts` carries minimal local faces (`ClientSessions`, `settingsScope`). If the harness ever splits out-of-tree aggregates this can move to the main-repo "one program must not hold both sides" pattern.
- **Windows editor detection** — registry App Paths plus `where`; untested on real Windows hardware.
- **Windows Terminal fallback** — `wt` first, plain `cmd` window fallback; iTerm preference is macOS-only.
- **No Node version management** — commands run under the system default Node; package manager is honored for script invocation (`pnpm run X`).
- **No Git status UI** — the registry stores no Git fields; agents use their own git capabilities.
- **Import scans one level** — the directory itself plus direct children; deeper trees need repeated imports.
