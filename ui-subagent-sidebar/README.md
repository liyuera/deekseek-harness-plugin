# @liuyera/dsh-client-ui-subagent-sidebar

English | [中文](README.zh.md)

Web subagent overview feature owner: contributes two entries to `shell.overlay` — a frame-wide running-count capsule and a right-docked overview panel. Both are pure projections of the session-list mirrors that [`dsh-client-runtime`](../runtime/README.md) folds from host frames, so this package issues no RPC and holds no data of its own: the running count comes from `byId` rows with `origin: 'subagent'` whose summary is currently running, and the panel tree is the `subagentsByParent` catalog mirror (the same push-based freshness model the [subagent catalog](../ui-subagent/README.md) uses — the manager keeps open catalogs refreshed while the panel subscribes them and unsubscribes on close).

The capsule renders only while at least one subagent session is running, so an idle host keeps the corner clean; clicking it opens the panel. The panel groups each root session's direct subagent catalog under a collapsible header — roots are the top-level sessions (no subagent origin, no parent), groups collapse and expand independently of one another, and rows follow the official catalog layout: a state dot (`running` → ongoing, settled → done), the durable label, a `title · mode · activity` secondary line, and token/duration metrics folded from the session projections. Branches expand lazily through the catalog mirror exactly like the shipped header action. Sessions in the workspace archive set carry an "archived" badge on their root header and rows, and archived rows are dimmed. A "running only" filter narrows the tree; Escape, arrow keys, Home and End navigate the tree with the shipped keyboard protocol.

## Model Experience

None, as this package renders host-computed session and catalog state for a human and touches no prompt, message, schema, stream, or tool result. The model's own view of subagents stays with the [subagent tool](../subagent/tool-subagent/README.md).

#### KV Cache effect

None; the package never assembles or sends provider requests.

## Known Limitations and Deferred Work

- **The panel is read-only** — rows navigate into the child's transcript but offer no interrupt, resume, or archive action of their own; those stay on the session surfaces where they already exist.
- **The tree is the catalog mirror, not the full descendant enumeration** — the panel lazily loads each expanded branch through `refreshSubagents`, so a deeply nested subtree only appears after its parents are opened (the same tradeoff as the shipped header catalog). This keeps freshness push-based rather than polling the full tree.
- **Root grouping follows the session list** — a root that the host excludes from the list mirror never appears, and the group headers sort by display title rather than a workspace order.
