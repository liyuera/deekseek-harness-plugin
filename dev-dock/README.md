# @liyuera/dsh-dev-dock

Frontend project engineering management for DeepSeek Harness, v2: projects are dsh workspaces (no separate registry), one-click start-work, and deterministic desktop actions that open projects in an IDE or a system terminal window. No agent in the loop, no approval prompt — the button click is the user's authorization. The only guard is the sandbox mode: `read-only` denies desktop side effects.

## Install

```sh
dsh plugin --profile web add link:/Users/liyu/Documents/www/DeepSeek/deepseek-harness/deekseek-harness-plugin/dev-dock
```

Restart `dsh web`. The sidebar foot shows **开始上班** (start-work dialog) above a `devDock - N项目` row (N = workspace count); every session header gets **IDE / 终端 / 启动** actions for its workspace; the devDock settings page opens from **设置 → devDock**.

## UI surfaces

| Surface | Slot | Purpose |
|---|---|---|
| 开始上班 button + devDock entry row | `sidebar.footer.action` | start-work dialog (remembered selection) + project count |
| IDE / 终端 / 启动 | `conversation.session.header.actions` | open editor / open system terminal / both, for the current session's workspace |
| start-work dialog | `shell.overlay` | checkbox list of workspaces, prefill from last selection |
| devDock settings page | `settings.section` | per-workspace editor preference, editor manual paths + detection refresh, terminal preference |

## How it works

- **Projects are dsh workspaces** (the workspace registry is the fact source; deleted workspaces simply drop out).
- **Settings namespace `dev-dock`** holds only preferences: `workspacePrefs` (per-workspace IDE), `editors` (detected + manual paths), `terminalApp` (Terminal.app / iTerm), `startWork` (selection memory).
- **Default editor**: per-workspace preference first; otherwise auto-detected — uni-app traits (manifest.json / project.config.json) prefer HBuilderX, other projects prefer WebStorm, then any installed editor.
- **Actions are deterministic**: the browser half POSTs a JSON action to the host route `/dev-dock/action` (registered through `webServer`); the host runs the open directly. Static client bundles have no package-private RPC channel (`host.call` is a dynamic-plugin builtin), so the loopback route is the sanctioned channel. The route is registered only when a web server is present; headless profiles just keep the settings namespace.
- **read-only guard**: `sandboxPolicy.resolve().mode === 'read-only'` rejects every action with an error.

## Build

```sh
tsc -b && tsdown --env.DSH_BUILD_FACE=client   # bins resolve from the harness root node_modules
```

The harness client-bundle preset only recognizes packages under `packages/*/*` (boundary gate since the harness `build(client): enforce client package boundaries` commit), so an out-of-tree build needs a transient manifest copy at `packages/litepack/dev-dock/package.json` during the tsdown step; remove it afterwards. `lib/` artifacts (including `lib/client.js`) are committed, install-and-go.

## Known limitations (v1)

- The devDock entry row opens the start-work dialog (the settings shell exposes no cross-plugin API to open the panel on a chosen section); the settings page is reached through 设置 → devDock.
- Tests for v1 were removed with the v1 surface; host unit tests (editor merge, action command building) and client component specs are the next iteration item.
- Windows detection and terminal fallback remain untested on real Windows hardware.
- The HTTP action route is loopback-bound like the rest of the web server; the browser page is the only same-origin caller.
