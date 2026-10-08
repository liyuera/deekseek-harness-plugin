# ui-favorite-prompts 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 dsh Web GUI 做纯插件版的"收藏提示词"：消息下方一键收藏、`@` 拉出收藏并整段插入、设置里增删改。

**Architecture:** 一个包两个半边。Host 半边开一个 `storageDomain` 域（per-record JSON）+ 一条同源 HTTP 路由；浏览器半边建一个快照 store 镜像宿主数据，并往三个官方扩展点投稿：自建 Chat 节点（收藏条）、`inputTriggers` 源（`@` 收藏组）、`settings.section`（管理页）。

**Tech Stack:** TypeScript / Cordis（插件与服务）、React（浏览器半边）、zod（存储域记录校验）、vitest（测试）、tsdown（构建，走本仓库 `build/client-bundle.ts`）。

**设计依据：** 同目录 [DESIGN.md](DESIGN.md)。计划与设计冲突时以设计为准，并回来改计划。

## Global Constraints

- **不修改 harness（`deepseek-harness/`）任何代码。** 只用它公开的扩展点与类型。
- 包名 `@liyuera/dsh-favorite-prompts`，目录 `deepseek-harness-plugin/ui-favorite-prompts/`。
- 命名（**不要互相"对齐"**）：domain 名与表名用下划线（`favorite_prompts` / `prompts`，受 `UNIT_NAME_RE = /^[a-z][a-z0-9_]*$/` 约束）；HTTP 路径 `/favorite-prompts`、设置 section id `favorite-prompts`、Chat 节点 kind `favorite-strip`、`@` 源名 `favorites`、词典命名空间 `favoritePrompts` 用连字符/驼峰。
- **Chat 节点 kind 必须是 `favorite-strip`**（14 字符）。排序依赖 `key = ${kind.length}:${kind}${id}` 的字典序：`14:favorite-strip…` 必须大于内置用户节点的 `13:input-message…`。改 kind 名就会让收藏条跑到气泡上面。
- **节点 `anchorSeq` 必须等于 `event.seq`**，与内置用户节点完全相等；小于该轮 `openingHumanAnchor` 会被折进"思考过程"折叠组。
- 所有产品可见文案走本插件自己的 locale 词典（`zh` 为键的真相源，`en` 用 `satisfies Record<Key, string>` 校验）。
- 样式：CSS Modules + `clsx`；只用 `--dsw-alias-*` 语义 token；不写字面色值；不写明暗分支；中性描边 `0.5px`；尺寸用 `calc(Npx + var(--dsh-content-font-delta, 0px))`；保留默认焦点环；`@media (hover: hover)` 之外保持常显。
- 浏览器半边**不得** `import`（值导入）任何 dsh 特性插件的运行时值：跨包只用 `import type`；共享 UI 只能来自 `ui-primitives`；`client/store` 与 `ui-primitives` 是 baseline external，不需要 `dsh.client.external`。
- 构建：`npx tsc -b && npx tsdown --config-loader tsx`（在插件目录内；bin 解析自 harness 根 `node_modules`）。
- 测试：`node ../../node_modules/vitest/vitest.mjs run`（在插件目录内）。组件测试文件首行加 `// @vitest-environment jsdom`。
- 每个 Task 结束提交一次，提交信息用 `feat(favorite-prompts): …` / `test(favorite-prompts): …`。

---

## 文件结构

| 文件 | 职责 |
|---|---|
| `src/schema.ts` | **纯类型 + 常量**（双半边共用），不引 zod，避免把 zod 带进浏览器包 |
| `src/domain.ts` | Host：zod 记录 schema + `defineDomain` 声明（只有 Host 半边引它） |
| `src/host/route.ts` | Host：协议逻辑，纯函数 `handlePromptRequest(table, request)`（可单测，不碰 HTTP/域） |
| `src/index.ts` | Host：域生命周期 + `webServer` 路由接线 |
| `src/client/normalize.ts` | 归一化（"什么算同一条"）与候选短名派生 |
| `src/client/transport.ts` | `fetch` 封装 |
| `src/client/store.ts` | 快照 store + 增删改 action + 归一化派生索引 |
| `src/client/locales.ts` | zh / en 词典 |
| `src/client/strip/definition.ts` | Chat 节点 Definition 与 view node 构造 |
| `src/client/strip/FavoriteStrip.tsx` | 收藏条组件（含行内撤销） |
| `src/client/strip/icons.tsx` | 本插件自己的书签图标（ui-primitives 没有书签字形） |
| `src/client/strip/FavoriteStrip.module.css` | 收藏条样式 |
| `src/client/trigger/source.ts` | `@` 触发源 |
| `src/client/settings/FavoritesSettingsPage.tsx` | 设置页 |
| `src/client/settings/FavoritesSettingsPage.module.css` | 设置页样式 |
| `src/client/index.ts` | `apply`：建 store、装配三个域 |

---

### Task 1: 包骨架与构建打通

**Files:**
- Create: `package.json`, `cordis.patch.yml`, `tsconfig.json`, `tsdown.config.ts`, `vitest.config.ts`
- Create: `src/schema.ts`, `src/index.ts`, `src/client/index.ts`, `src/client/locales.ts`

**Interfaces:**
- Consumes: 无
- Produces: 可构建的包骨架；`PROMPT_DOMAIN` / `PROMPT_TABLE` / `PROMPT_ROUTE` 常量与 `PromptRecord` 等类型（后续所有 Task 依赖）

- [ ] **Step 1: 建目录与 `src/schema.ts`（纯类型，无 zod）**

```ts
/**
 * Shared vocabulary of the favorite-prompts plugin: names, record types, and
 * HTTP bodies. Types only — the zod record schema lives in `domain.ts` so the
 * browser bundle never carries zod.
 */

/** Storage domain name; `UNIT_NAME_RE` forbids hyphens. */
export const PROMPT_DOMAIN = 'favorite_prompts'
/** Table holding one record per saved prompt. */
export const PROMPT_TABLE = 'prompts'
/** Same-origin HTTP route serving the browser half. */
export const PROMPT_ROUTE = '/favorite-prompts'

/** Origin message of a saved prompt. Reference only; never part of identity. */
export interface PromptSourceRef {
  sessionId: string
  seq: number
}

/** One saved prompt. */
export interface PromptRecord {
  id: string
  text: string
  createdAt: number
  source?: PromptSourceRef
}

/** Successful list answer. */
export interface PromptListResponse { ok: true; items: PromptRecord[] }
/** Successful single-record answer. */
export interface PromptItemResponse { ok: true; item: PromptRecord }
/** Successful delete/restore answer. */
export interface PromptOkResponse { ok: true }
/** Failed answer; `error` is one sentence shown in a toast. */
export interface PromptErrorResponse { ok: false; error: string }
/** Every answer of the route. */
export type PromptResponse = PromptListResponse | PromptItemResponse | PromptOkResponse | PromptErrorResponse

/** Parsed request handed to the protocol layer. */
export interface PromptRequest {
  method: string
  /** `id` query parameter, when present. */
  queryId?: string
  /** Parsed JSON body, or undefined when absent/invalid. */
  body?: unknown
}
```

- [ ] **Step 2: 建 `src/domain.ts`（Host 专用，zod + storageDomain）**

```ts
/** Storage domain declaration for saved prompts. Host half only. */
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain'
import { z } from 'zod'
import { PROMPT_DOMAIN, PROMPT_TABLE, type PromptRecord } from './schema.ts'

const PromptSourceSchema = z.object({
  sessionId: z.string().min(1),
  seq: z.number().int().nonnegative(),
})

const PromptRecordSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  createdAt: z.number().int().nonnegative(),
  source: PromptSourceSchema.optional(),
})

/**
 * One JSON document per saved prompt under `$DSH_HOME/storages`; a record that
 * fails its schema is moved aside instead of bricking the whole domain.
 */
export const favoritesDomain = defineDomain({
  name: PROMPT_DOMAIN,
  version: 1,
  layout: 'per-record',
  invalidRecords: 'backup-and-skip',
  tables: {
    [PROMPT_TABLE]: domainTable<string, PromptRecord>(PromptRecordSchema),
  },
})
```

- [ ] **Step 3: 建 `src/client/locales.ts`**

```ts
/** Copy dictionaries for the favorite-prompts plugin. */

/** Simplified Chinese dictionary and key source of truth. */
export const zh = {
  'nav': '收藏提示词',
  'group': '收藏',
  'strip.favorite': '收藏这条提示词',
  'strip.unfavorite': '取消收藏',
  'strip.undo': '撤销',
  'strip.undone': '已取消收藏',
  'strip.added': '已收藏',
  'strip.failed': '操作失败，请重试',
  'settings.new': '新增收藏',
  'settings.empty': '还没有收藏。在任意一条自己发出的消息下方点书签图标即可收藏。',
  'settings.unavailable': '收藏服务不可用：{reason}',
  'settings.loading': '正在读取收藏…',
  'settings.save': '保存',
  'settings.cancel': '取消',
  'settings.edit': '编辑',
  'settings.delete': '删除',
  'settings.confirmDelete': '确认删除',
  'settings.placeholder': '粘贴或输入一段提示词',
  'settings.createdAt': '收藏于 {time}',
} satisfies Record<string, string>

/** Favorite-prompts locale key union. */
export type FavoritePromptsKey = keyof typeof zh

/** English dictionary checked against the Chinese key set. */
export const en = {
  'nav': 'Saved prompts',
  'group': 'Saved',
  'strip.favorite': 'Save this prompt',
  'strip.unfavorite': 'Remove from saved',
  'strip.undo': 'Undo',
  'strip.undone': 'Removed',
  'strip.added': 'Saved',
  'strip.failed': 'Failed, please retry',
  'settings.new': 'New saved prompt',
  'settings.empty': 'Nothing saved yet. Use the bookmark button under any message you sent.',
  'settings.unavailable': 'Saved prompts are unavailable: {reason}',
  'settings.loading': 'Reading saved prompts…',
  'settings.save': 'Save',
  'settings.cancel': 'Cancel',
  'settings.edit': 'Edit',
  'settings.delete': 'Delete',
  'settings.confirmDelete': 'Confirm delete',
  'settings.placeholder': 'Paste or type a prompt',
  'settings.createdAt': 'Saved {time}',
} satisfies Record<FavoritePromptsKey, string>

/** Dictionary namespace owned by this plugin. */
export const NS = 'favoritePrompts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Favorite-prompts copy. */
    favoritePrompts: FavoritePromptsKey
  }
}
```

- [ ] **Step 4: 建临时的两个 `apply`（后续 Task 会替换）**

`src/index.ts`（此刻只需能编译，Task 3 写真实实现）：

```ts
/** Favorite-prompts host half. Real wiring lands in Task 3. */
import type { Context } from '@deepseek-ai/cordis'

/** Host plugin body. */
export function apply(_ctx: Context): void {}
```

`src/client/index.ts`：

```ts
/** Favorite-prompts browser half. Real wiring lands in Task 8. */
import type { Context as ClientContext } from '@deepseek-ai/cordis'

/** Required browser services. */
export const inject = ['slots', 'locale']

/** Browser plugin body. */
export function apply(_ctx: ClientContext): void {}
```

- [ ] **Step 5: 建 `package.json`**

```json
{
  "name": "@liyuera/dsh-favorite-prompts",
  "description": "Saved prompts for dsh: bookmark a message, recall it with @ in the composer, manage the list in Settings",
  "version": "0.1.0",
  "type": "module",
  "main": "lib/index.js",
  "types": "lib/types/index.d.ts",
  "exports": {
    ".": { "types": "./lib/types/index.d.ts", "default": "./lib/index.js" },
    "./client": { "types": "./lib/types/client/index.d.ts", "default": "./lib/client.js" },
    "./src/*": "./src/*",
    "./package.json": "./package.json"
  },
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": {
      "inject": [
        "@deepseek-ai/dsh-client-locale",
        "@deepseek-ai/dsh-client-ui-renderer",
        "@deepseek-ai/dsh-client-ui-conversation",
        "@deepseek-ai/dsh-client-ui-chat",
        "@deepseek-ai/dsh-client-ui-input-trigger"
      ],
      "platform": "web"
    }
  },
  "scripts": {
    "bundle": "tsdown --config-loader tsx",
    "watch": "tsdown --watch --config-loader tsx",
    "test": "vitest run"
  },
  "files": ["lib/index.js", "lib/client.js", "lib/types/**/*.d.ts", "cordis.patch.yml"],
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/liyuera/deepseek-harness-plugin.git",
    "directory": "ui-favorite-prompts"
  },
  "publishConfig": { "access": "public" },
  "dependencies": {
    "@deepseek-ai/dsh-storage-domain": "^0.1.6-alpha.2"
  },
  "peerDependencies": {
    "@deepseek-ai/cordis": "^4.0.2"
  },
  "devDependencies": {
    "@deepseek-ai/cordis": "^4.0.2",
    "@deepseek-ai/dsh-client-locale": "^0.1.6-alpha.2",
    "@deepseek-ai/dsh-client-store": "^0.1.6-alpha.2",
    "@deepseek-ai/dsh-client-ui-chat": "^0.1.6-alpha.2",
    "@deepseek-ai/dsh-client-ui-conversation": "^0.1.6-alpha.2",
    "@deepseek-ai/dsh-client-ui-input-trigger": "^0.1.6-alpha.2",
    "@deepseek-ai/dsh-client-ui-primitives": "^0.1.6-alpha.2",
    "@deepseek-ai/dsh-client-ui-renderer": "^0.1.6-alpha.2",
    "@deepseek-ai/dsh-client-ui-slots": "^0.1.6-alpha.2",
    "@deepseek-ai/dsh-host-webserver": "^0.1.6-alpha.2",
    "@deepseek-ai/dsh-session": "^0.1.6-alpha.2",
    "@deepseek-ai/dsh-storage": "^0.1.6-alpha.2",
    "@testing-library/react": "^16.3.2",
    "@types/react": "~18.3.1",
    "@types/react-dom": "~18.3.1",
    "react": "^18.2.0",
    "react-dom": "^18.3.1",
    "zod": "^4.4.3"
  }
}
```

- [ ] **Step 6: 建 `cordis.patch.yml`**

```yaml
# dsh bundle layer: mount the favorite-prompts plugin (host route + browser UI).
- insert:
    - id: favorite-prompts
      name: '@liyuera/dsh-favorite-prompts'
```

- [ ] **Step 7: 建 `tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.client.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "lib/types",
    "types": ["node"]
  },
  "include": ["src"],
  "references": [
    { "path": "../../vendor/cordis" },
    { "path": "../../vendor/schemastery" },
    { "path": "../../packages/client/ui-slots" },
    { "path": "../../packages/client/ui-renderer" },
    { "path": "../../packages/client/ui-conversation" },
    { "path": "../../packages/client/ui-chat" },
    { "path": "../../packages/client/locale" },
    { "path": "../../packages/client/ui-primitives" },
    { "path": "../../packages/client/store" },
    { "path": "../../packages/host/webserver" },
    { "path": "../../packages/storage/storage-domain" },
    { "path": "../../packages/storage/storage" }
  ]
}
```

- [ ] **Step 8: 建 `tsdown.config.ts`**

```ts
/**
 * Builds the host bundle (lib/index.js) and the browser bundle (lib/client.js)
 * with this repo's shared out-of-tree helper. Build with `npx tsc -b && npx
 * tsdown --config-loader tsx` from this directory.
 */
import { clientBundleConfig, nodeLibraryConfig } from '../build/client-bundle.ts'

export default [
  nodeLibraryConfig('@liyuera/dsh-favorite-prompts', ['lib/types/index.js']),
  clientBundleConfig('@liyuera/dsh-favorite-prompts'),
]
```

- [ ] **Step 9: 建 `vitest.config.ts`（别名指向 harness 源码）**

```ts
/**
 * Standalone vitest project. Workspace packages resolve through explicit
 * aliases because this repo has no node_modules links for them; react resolves
 * to the local install so the renderer, ui-primitives, and the testing library
 * share one instance.
 */
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const root = fileURLToPath(new URL('../../', import.meta.url))
const reactDir = fileURLToPath(new URL('./node_modules/react', import.meta.url))
const reactDomDir = fileURLToPath(new URL('./node_modules/react-dom', import.meta.url))

const ALIASES: Array<[string, string]> = [
  ['react$', `${reactDir}/index.js`],
  ['react/jsx-runtime$', `${reactDir}/jsx-runtime.js`],
  ['react-dom$', `${reactDomDir}/index.js`],
  ['react-dom/client$', `${reactDomDir}/client.js`],
  ['@deepseek-ai/cordis$', 'vendor/cordis/src/index.ts'],
  ['@deepseek-ai/cordis/', 'vendor/cordis/src/'],
  ['@deepseek-ai/schemastery$', 'vendor/schemastery/src/index.ts'],
  ['@deepseek-ai/dsh-storage-domain$', 'packages/storage/storage-domain/src/index.ts'],
  ['@deepseek-ai/dsh-storage$', 'packages/storage/storage/src/index.ts'],
  ['@deepseek-ai/dsh-client-store$', 'packages/client/store/src/index.ts'],
  ['@deepseek-ai/dsh-client-ui-slots$', 'packages/client/ui-slots/src/index.ts'],
  ['@deepseek-ai/dsh-client-ui-primitives$', 'packages/client/ui-primitives/src/index.ts'],
  ['@deepseek-ai/dsh-client-ui-renderer/client$', 'packages/client/ui-renderer/src/client/index.ts'],
  ['@deepseek-ai/dsh-client-locale/client$', 'packages/client/locale/src/client/index.ts'],
  ['@deepseek-ai/dsh-client-ui-conversation/client$', 'packages/client/ui-conversation/src/client/index.ts'],
  ['@deepseek-ai/dsh-client-ui-chat/client$', 'packages/client/ui-chat/src/client/index.ts'],
  ['@deepseek-ai/dsh-session/surface$', 'packages/core/session/src/surface.ts'],
  ['@deepseek-ai/dsh-session/types$', 'packages/core/session/src/types.ts'],
  ['@deepseek-ai/dsh-host-webserver$', 'packages/host/webserver/src/index.ts'],
]

export default defineConfig({
  resolve: {
    alias: ALIASES.map(([find, replacement]) => ({
      find: new RegExp(`^${find}`),
      replacement: replacement.startsWith('/') ? replacement : `${root}${replacement}`,
    })),
  },
  test: {
    include: ['tests/**/*.spec.ts', 'tests/**/*.spec.tsx'],
    environment: 'node',
    server: { deps: { inline: ['@testing-library/react'] } },
  },
})
```

- [ ] **Step 10: 建构建期依赖软链**

```bash
cd deepseek-harness-plugin/ui-favorite-prompts
mkdir -p node_modules/@deepseek-ai
for p in client/locale client/store client/ui-slots client/ui-renderer client/ui-conversation client/ui-chat client/ui-primitives client/ui-input-trigger host/webserver storage/storage-domain storage/storage runtime-diagnostics/invariants; do
  name="dsh-$(basename $p)"
  [ "$p" = "client/locale" ] && name="dsh-client-locale"
  ln -sfn "../../../../packages/$p" "node_modules/@deepseek-ai/$name"
done
ln -sfn ../../../../vendor/cordis node_modules/@deepseek-ai/cordis
ln -sfn ../../../../vendor/schemastery node_modules/@deepseek-ai/schemastery
ln -sfn ../../../../node_modules/.pnpm/zod@4.4.3/node_modules/zod node_modules/zod
```

（若 zod 的 pnpm 路径版本号不同，用 `ls ../../node_modules/.pnpm | grep '^zod@'` 取实际目录名。）

- [ ] **Step 11: 构建验证**

Run: `cd deepseek-harness-plugin/ui-favorite-prompts && npx tsc -b && npx tsdown --config-loader tsx`
Expected: 无错退出，且 `ls lib/index.js lib/client.js` 两个文件都存在。

- [ ] **Step 12: 提交**

```bash
cd deepseek-harness-plugin && git add ui-favorite-prompts && git commit -m "feat(favorite-prompts): 包骨架、构建与测试配置"
```

---

### Task 2: 归一化与候选短名（TDD）

**Files:**
- Test: `tests/normalize.spec.ts`
- Create: `src/client/normalize.ts`

**Interfaces:**
- Consumes: 无
- Produces: `normalizeText(text: string): string`、`candidateName(text: string, taken: ReadonlySet<string>): string`、`previewText(text: string, limit?: number): string`、`CANDIDATE_NAME_LIMIT`

- [ ] **Step 1: 写失败测试 `tests/normalize.spec.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { candidateName, normalizeText, previewText } from '../src/client/normalize.ts'

describe('normalizeText', () => {
  it('folds CRLF and lone CR into LF', () => {
    expect(normalizeText('a\r\nb\rc')).toBe('a\nb\nc')
  })

  it('drops trailing whitespace on every line and trims the ends', () => {
    expect(normalizeText('  a  \n b\t\n')).toBe('a\nb')
  })

  it('collapses runs of spaces and tabs inside a line', () => {
    expect(normalizeText('a   b\t\tc')).toBe('a b c')
  })

  it('applies NFC so composed and decomposed forms compare equal', () => {
    expect(normalizeText('e\u0301')).toBe(normalizeText('\u00e9'))
  })

  it('treats a rewritten-word prompt as a different prompt', () => {
    expect(normalizeText('run the tests')).not.toBe(normalizeText('run all the tests'))
  })
})

describe('candidateName', () => {
  it('uses the first non-empty line', () => {
    expect(candidateName('\n\n第一行标题\n正文', new Set())).toBe('第一行标题')
  })

  it('truncates to the candidate name limit by code point', () => {
    const name = candidateName('字'.repeat(60), new Set())
    expect([...name]).toHaveLength(40)
  })

  it('suffixes a duplicate name instead of repeating it', () => {
    const taken = new Set(['同名'])
    expect(candidateName('同名\n正文', taken)).toBe('同名 (2)')
  })
})

describe('previewText', () => {
  it('flattens newlines and truncates with an ellipsis', () => {
    expect(previewText('a\n\nb')).toBe('a b')
    expect(previewText('abcdef', 3)).toBe('abc…')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd deepseek-harness-plugin/ui-favorite-prompts && node ../../node_modules/vitest/vitest.mjs run tests/normalize.spec.ts`
Expected: FAIL — 找不到模块 `../src/client/normalize.ts`

- [ ] **Step 3: 实现 `src/client/normalize.ts`**

```ts
/**
 * Prompt identity: the whitespace and encoding differences two copies of the
 * same prompt may carry. This is the single definition of "the same prompt";
 * the derived lookup index in the store is built from it, and nothing about it
 * is persisted (a stored hash would freeze the rule).
 */

/** Longest derived menu identity, in code points. */
export const CANDIDATE_NAME_LIMIT = 40

/**
 * Fold the differences that do not change which prompt a text is.
 * @param text - raw prompt or message text.
 * @returns the comparison form.
 */
export function normalizeText(text: string): string {
  return text
    .normalize('NFC')
    .replace(/\r\n?/gu, '\n')
    .split('\n')
    .map(line => line.replace(/[ \t]+$/u, ''))
    .join('\n')
    .replace(/[ \t]+/gu, ' ')
    .trim()
}

/**
 * Derive the short menu identity of one saved prompt.
 * @param text - saved prompt text.
 * @param taken - identities already used in the same menu.
 * @returns a unique identity within `taken`.
 */
export function candidateName(text: string, taken: ReadonlySet<string>): string {
  const firstLine = text.split('\n').find(line => line.trim() !== '') ?? text
  const trimmed = firstLine.trim()
  const base = [...trimmed].slice(0, CANDIDATE_NAME_LIMIT).join('') || trimmed
  if (!taken.has(base)) return base
  for (let n = 2; ; n += 1) {
    const candidate = `${base} (${n})`
    if (!taken.has(candidate)) return candidate
  }
}

/**
 * One-line preview for a menu row or a settings row.
 * @param text - saved prompt text.
 * @param limit - longest preview in code points.
 * @returns the flattened preview.
 */
export function previewText(text: string, limit = 80): string {
  const flat = normalizeText(text).replace(/\n+/gu, ' ')
  const points = [...flat]
  return points.length <= limit ? flat : `${points.slice(0, limit).join('')}…`
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd deepseek-harness-plugin/ui-favorite-prompts && node ../../node_modules/vitest/vitest.mjs run tests/normalize.spec.ts`
Expected: PASS（12 个用例）

- [ ] **Step 5: 提交**

```bash
cd deepseek-harness-plugin && git add ui-favorite-prompts && git commit -m "feat(favorite-prompts): 文本归一化与候选短名派生"
```

---

### Task 3: Host 半边协议层与 HTTP 路由

**Files:**
- Test: `tests/route.spec.ts`
- Create: `src/host/route.ts`
- Modify: `src/index.ts`（替换 Task 1 的空实现）

**Interfaces:**
- Consumes: `src/schema.ts` 的类型与常量；`src/domain.ts` 的 `favoritesDomain`
- Produces:
  - `interface PromptTable { entries(): IterableIterator<[string, PromptRecord]>; get(key: string): PromptRecord | undefined; put(key: string, value: PromptRecord): Promise<void>; delete(key: string): Promise<boolean> }`
  - `handlePromptRequest(table: PromptTable, request: PromptRequest, now?: () => number): Promise<PromptResponse>`
  - `apply(ctx)`：域生命周期 + 路由接线

协议（供浏览器半边依赖）：

| 方法 | 请求 | 成功响应 |
|---|---|---|
| `GET` | — | `{ ok: true, items: PromptRecord[] }`，按 `createdAt` 降序 |
| `POST` | `{ text, source? }` | `{ ok: true, item }`，host 铸造 `id` |
| `PATCH` | `{ id, text }` | `{ ok: true, item }` |
| `PUT` | `{ id, text, createdAt, source? }` | `{ ok: true, item }`（撤销用：按原 id 原样写回） |
| `DELETE` | `?id=<id>` | `{ ok: true }` |

失败一律 `{ ok: false, error }`：方法不支持 405、body 不是对象 400、`text` 空 400、未知 `id` 404。

- [ ] **Step 1: 写失败测试 `tests/route.spec.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { handlePromptRequest, type PromptTable } from '../src/host/route.ts'
import type { PromptRecord } from '../src/schema.ts'

/** In-memory table with the same surface the storage domain publishes. */
function fakeTable(seed: PromptRecord[] = []): PromptTable & { size(): number } {
  const rows = new Map(seed.map(record => [record.id, record]))
  return {
    entries: () => rows.entries(),
    get: key => rows.get(key),
    put: async (key, value) => { rows.set(key, value) },
    delete: async (key) => rows.delete(key),
    size: () => rows.size,
  }
}

const AT = 1_700_000_000_000

describe('handlePromptRequest', () => {
  it('lists newest first', async () => {
    const table = fakeTable([
      { id: 'a', text: 'older', createdAt: AT },
      { id: 'b', text: 'newer', createdAt: AT + 10 },
    ])
    const response = await handlePromptRequest(table, { method: 'GET' })
    expect(response).toEqual({ ok: true, items: [
      { id: 'b', text: 'newer', createdAt: AT + 10 },
      { id: 'a', text: 'older', createdAt: AT },
    ] })
  })

  it('creates a record with a host-minted id and the request source', async () => {
    const table = fakeTable()
    const response = await handlePromptRequest(
      table,
      { method: 'POST', body: { text: 'hello', source: { sessionId: 's1', seq: 3 } } },
      () => AT,
    )
    expect(response.ok).toBe(true)
    expect(response).toMatchObject({ ok: true, item: { text: 'hello', createdAt: AT, source: { sessionId: 's1', seq: 3 } } })
    expect(table.size()).toBe(1)
  })

  it('refuses an empty text', async () => {
    const response = await handlePromptRequest(fakeTable(), { method: 'POST', body: { text: '   ' } })
    expect(response).toEqual({ ok: false, error: expect.stringContaining('text') })
  })

  it('updates one record and keeps its createdAt', async () => {
    const table = fakeTable([{ id: 'a', text: 'old', createdAt: AT }])
    const response = await handlePromptRequest(table, { method: 'PATCH', body: { id: 'a', text: 'new' } })
    expect(response).toEqual({ ok: true, item: { id: 'a', text: 'new', createdAt: AT } })
  })

  it('restores a record verbatim through PUT', async () => {
    const table = fakeTable()
    const record: PromptRecord = { id: 'a', text: 'back', createdAt: AT, source: { sessionId: 's', seq: 1 } }
    const response = await handlePromptRequest(table, { method: 'PUT', body: record })
    expect(response).toEqual({ ok: true, item: record })
  })

  it('deletes by query id and reports an unknown id as 404', async () => {
    const table = fakeTable([{ id: 'a', text: 'x', createdAt: AT }])
    expect(await handlePromptRequest(table, { method: 'DELETE', queryId: 'a' })).toEqual({ ok: true })
    expect(table.size()).toBe(0)
    expect(await handlePromptRequest(table, { method: 'DELETE', queryId: 'a' })).toEqual({ ok: false, error: expect.stringContaining('404') })
  })

  it('rejects an unsupported method and a non-object body', async () => {
    expect(await handlePromptRequest(fakeTable(), { method: 'OPTIONS' })).toEqual({ ok: false, error: expect.stringContaining('405') })
    expect(await handlePromptRequest(fakeTable(), { method: 'POST', body: 'nope' })).toEqual({ ok: false, error: expect.stringContaining('400') })
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd deepseek-harness-plugin/ui-favorite-prompts && node ../../node_modules/vitest/vitest.mjs run tests/route.spec.ts`
Expected: FAIL — 找不到模块 `../src/host/route.ts`

- [ ] **Step 3: 实现 `src/host/route.ts`**

```ts
/**
 * Protocol layer of the favorite-prompts route: method dispatch, record
 * minting, and error wording. Transport (HTTP) and durability (the storage
 * domain) are the callers' concerns, so every rule here is testable against a
 * plain table.
 */
import type { PromptRecord, PromptRequest, PromptResponse, PromptSourceRef } from '../schema.ts'

/** The slice of a storage-domain table this route needs. */
export interface PromptTable {
  entries(): IterableIterator<[string, PromptRecord]>
  get(key: string): PromptRecord | undefined
  put(key: string, value: PromptRecord): Promise<void>
  delete(key: string): Promise<boolean>
}

function fail(status: number, error: string): PromptResponse {
  return { ok: false, error: `${status} ${error}` }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readText(body: Record<string, unknown>): string | undefined {
  return typeof body.text === 'string' && body.text.trim() !== '' ? body.text : undefined
}

function readSource(body: Record<string, unknown>): PromptSourceRef | undefined {
  if (!isRecord(body.source)) return undefined
  const { sessionId, seq } = body.source
  if (typeof sessionId !== 'string' || sessionId === '') return undefined
  if (typeof seq !== 'number' || !Number.isInteger(seq) || seq < 0) return undefined
  return { sessionId, seq }
}

/**
 * Answer one parsed request against one table.
 * @param table - saved-prompt table (the storage domain's `prompts` table).
 * @param request - parsed method, `id` query parameter, and JSON body.
 * @param now - clock injection for tests.
 * @returns the response body the transport serializes.
 */
export async function handlePromptRequest(
  table: PromptTable,
  request: PromptRequest,
  now: () => number = Date.now,
): Promise<PromptResponse> {
  const body = isRecord(request.body) ? request.body : undefined

  if (request.method === 'GET') {
    const items = [...table.entries()].map(([, record]) => record)
      .sort((left, right) => right.createdAt - left.createdAt)
    return { ok: true, items }
  }

  if (request.method === 'POST') {
    if (body === undefined) return fail(400, 'body must be a JSON object')
    const text = readText(body)
    if (text === undefined) return fail(400, 'text must be a non-empty string')
    const source = readSource(body)
    const record: PromptRecord = {
      id: crypto.randomUUID(),
      text,
      createdAt: now(),
      ...(source === undefined ? {} : { source }),
    }
    await table.put(record.id, record)
    return { ok: true, item: record }
  }

  if (request.method === 'PUT') {
    if (body === undefined) return fail(400, 'body must be a JSON object')
    const text = readText(body)
    const id = typeof body.id === 'string' && body.id !== '' ? body.id : undefined
    const createdAt = typeof body.createdAt === 'number' && Number.isFinite(body.createdAt) ? body.createdAt : undefined
    if (text === undefined || id === undefined || createdAt === undefined) {
      return fail(400, 'id, text, and createdAt are required')
    }
    const source = readSource(body)
    const record: PromptRecord = { id, text, createdAt, ...(source === undefined ? {} : { source }) }
    await table.put(id, record)
    return { ok: true, item: record }
  }

  if (request.method === 'PATCH') {
    if (body === undefined) return fail(400, 'body must be a JSON object')
    const text = readText(body)
    const id = typeof body.id === 'string' && body.id !== '' ? body.id : undefined
    if (text === undefined || id === undefined) return fail(400, 'id and text are required')
    const current = table.get(id)
    if (current === undefined) return fail(404, `no saved prompt with id ${id}`)
    const next: PromptRecord = { ...current, text }
    await table.put(id, next)
    return { ok: true, item: next }
  }

  if (request.method === 'DELETE') {
    const id = request.queryId
    if (id === undefined || id === '') return fail(400, 'id query parameter is required')
    if (!(await table.delete(id))) return fail(404, `no saved prompt with id ${id}`)
    return { ok: true }
  }

  return fail(405, `method ${request.method} is not allowed`)
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd deepseek-harness-plugin/ui-favorite-prompts && node ../../node_modules/vitest/vitest.mjs run tests/route.spec.ts`
Expected: PASS（8 个用例）

- [ ] **Step 5: 写真实 `src/index.ts`**

```ts
/**
 * Favorite-prompts host half: opens the storage domain its records live in and
 * serves the browser half's same-origin route. A composition without a web
 * server has no browser half either, so the plugin stays inert there.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { DomainError, type Domain, type DomainFacility } from '@deepseek-ai/dsh-storage-domain'
import type { WebServer } from '@deepseek-ai/dsh-host-webserver'
import { favoritesDomain } from './domain.ts'
import { handlePromptRequest, type PromptTable } from './host/route.ts'
import { PROMPT_ROUTE, PROMPT_TABLE, type PromptRequest, type PromptResponse } from './schema.ts'

/** Host plugin name. */
export const name = 'favorite-prompts'

/** Background open attempts tolerated while a previous fiber releases the domain. */
const OPEN_ATTEMPTS = 10
/** Delay between open attempts, in ms. */
const OPEN_RETRY_MS = 100

/**
 * Open the domain, tolerating the short window in which a reloaded fiber's
 * predecessor still holds the installation-wide domain name.
 * @param facility - mounted domain facility.
 * @returns the opened domain.
 */
async function openDomain(facility: DomainFacility): Promise<Domain<typeof favoritesDomain>> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await facility.open(favoritesDomain)
    } catch (error) {
      const retryable = error instanceof DomainError && error.code === 'already-open'
      if (!retryable || attempt >= OPEN_ATTEMPTS) throw error
      await new Promise(resolve => setTimeout(resolve, OPEN_RETRY_MS))
    }
  }
}

/**
 * Read the request body as JSON, tolerating an empty or malformed body.
 * @param req - incoming request.
 * @returns the parsed body, or undefined.
 */
async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  const raw = Buffer.concat(chunks).toString('utf-8').trim()
  if (raw === '') return undefined
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

/**
 * Write one JSON answer.
 * @param res - response to own.
 * @param status - HTTP status code.
 * @param value - response body.
 */
function writeJson(res: ServerResponse, status: number, value: PromptResponse): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(value))
}

/** Mount the domain and the route. */
export function apply(ctx: Context): void {
  const webServer = ctx.get('webServer') as WebServer | undefined
  const facility = ctx.get('storageDomain') as DomainFacility | undefined
  if (webServer === undefined || facility === undefined) return

  let disposed = false
  const ready = openDomain(facility).then((domain) => {
    // A late open must still reach quiescence: the domain is closed here rather
    // than leaked, and the route reports the failure.
    if (disposed) {
      void domain.close()
      throw new Error('favorite-prompts: domain opened after disposal')
    }
    return domain
  })
  // The route surfaces this rejection; nothing else observes the promise.
  ready.catch(() => {})

  ctx.effect(() => () => {
    disposed = true
    void ready.then(domain => domain.close()).catch(() => {})
  }, 'favorite-prompts: domain lifetime')

  ctx.effect(() => webServer.register({
    kind: 'exact',
    path: PROMPT_ROUTE,
    handler: async (req, res) => {
      const url = new URL(req.url ?? PROMPT_ROUTE, 'http://localhost')
      const request: PromptRequest = {
        method: req.method ?? 'GET',
        ...(url.searchParams.get('id') === null ? {} : { queryId: url.searchParams.get('id') as string }),
        ...(req.method === 'POST' || req.method === 'PATCH' || req.method === 'PUT'
          ? { body: await readJsonBody(req) }
          : {}),
      }
      try {
        const domain = await ready
        const table = domain.table(PROMPT_TABLE) as unknown as PromptTable
        const response = await handlePromptRequest(table, request)
        writeJson(res, response.ok ? 200 : Number(response.error.slice(0, 3)), response)
      } catch (error) {
        writeJson(res, 503, { ok: false, error: error instanceof Error ? error.message : String(error) })
      }
    },
  }), 'favorite-prompts: route')
}
```

（`response.error` 的形状是 `"<status> <message>"`，所以路由用它回填 HTTP 状态码；这层耦合由 Task 3 的测试固定。）

- [ ] **Step 6: 类型检查与构建**

Run: `cd deepseek-harness-plugin/ui-favorite-prompts && npx tsc -b && npx tsdown --config-loader tsx`
Expected: 无错退出。

- [ ] **Step 7: 提交**

```bash
cd deepseek-harness-plugin && git add ui-favorite-prompts && git commit -m "feat(favorite-prompts): Host 半边协议层、存储域与 HTTP 路由"
```

---

### Task 4: 浏览器 transport 与 store

**Files:**
- Test: `tests/store.spec.ts`
- Create: `src/client/transport.ts`, `src/client/store.ts`

**Interfaces:**
- Consumes: `normalizeText`（Task 2）、`PromptRecord` / `PromptSourceRef`（Task 1）
- Produces:
  - `interface PromptTransport { list(): Promise<PromptRecord[]>; create(text, source?): Promise<PromptRecord>; update(id, text): Promise<PromptRecord>; restore(record): Promise<PromptRecord>; remove(id): Promise<void> }`
  - `createFavoritesStore(transport?: PromptTransport): { state: SnapshotStore<FavoritesState>; actions: FavoritesActions }`
  - `interface FavoritesState { status: 'loading'|'ready'|'error'; items: readonly PromptRecord[]; byText: ReadonlyMap<string, PromptRecord>; error?: string }`
  - `interface FavoritesActions { refresh(): Promise<boolean>; add(text, source?): Promise<boolean>; update(id, text): Promise<boolean>; remove(id): Promise<PromptRecord | null>; restore(record): Promise<boolean> }`

- [ ] **Step 1: 写失败测试 `tests/store.spec.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { createFavoritesStore } from '../src/client/store.ts'
import type { PromptTransport } from '../src/client/transport.ts'
import type { PromptRecord } from '../src/schema.ts'

const AT = 1_700_000_000_000

/** Transport double: an in-memory list behind the same surface as the fetch one. */
function fakeTransport(seed: PromptRecord[] = []): PromptTransport & { rows: PromptRecord[] } {
  const rows = [...seed]
  return {
    rows,
    list: async () => [...rows].sort((left, right) => right.createdAt - left.createdAt),
    create: async (text, source) => {
      const record: PromptRecord = { id: `id${rows.length + 1}`, text, createdAt: AT + rows.length, ...(source === undefined ? {} : { source }) }
      rows.push(record)
      return record
    },
    update: async (id, text) => {
      const index = rows.findIndex(row => row.id === id)
      const next = { ...rows[index] as PromptRecord, text }
      rows[index] = next
      return next
    },
    restore: async (record) => { rows.push(record); return record },
    remove: async (id) => { rows.splice(rows.findIndex(row => row.id === id), 1) },
  }
}

describe('createFavoritesStore', () => {
  it('mirrors the host list and indexes it by normalized text', async () => {
    const transport = fakeTransport([{ id: 'a', text: 'Run   the\ntests', createdAt: AT }])
    const favorites = createFavoritesStore(transport)
    expect(await favorites.actions.refresh()).toBe(true)
    const state = favorites.state.getSnapshot()
    expect(state.status).toBe('ready')
    expect(state.items).toHaveLength(1)
    expect(state.byText.has('Run the tests')).toBe(true)
  })

  it('reaches error state with the message when the host is unreachable', async () => {
    const transport = fakeTransport()
    transport.list = async () => { throw new Error('503 unavailable') }
    const favorites = createFavoritesStore(transport)
    expect(await favorites.actions.refresh()).toBe(false)
    expect(favorites.state.getSnapshot()).toMatchObject({ status: 'error', error: '503 unavailable' })
  })

  it('adds, updates, and removes through the transport', async () => {
    const favorites = createFavoritesStore(fakeTransport())
    await favorites.actions.refresh()
    expect(await favorites.actions.add('第一条')).toBe(true)
    const added = favorites.state.getSnapshot().items[0] as PromptRecord
    expect(await favorites.actions.update(added.id, '第二条')).toBe(true)
    expect(favorites.state.getSnapshot().byText.has('第二条')).toBe(true)
    const removed = await favorites.actions.remove(added.id)
    expect(removed?.text).toBe('第二条')
    expect(favorites.state.getSnapshot().items).toHaveLength(0)
  })

  it('keeps the previous list when a mutation fails', async () => {
    const transport = fakeTransport([{ id: 'a', text: 'keep', createdAt: AT }])
    const favorites = createFavoritesStore(transport)
    await favorites.actions.refresh()
    transport.create = async () => { throw new Error('boom') }
    expect(await favorites.actions.add('nope')).toBe(false)
    expect(favorites.state.getSnapshot().items).toHaveLength(1)
  })

  it('restores a removed record verbatim', async () => {
    const transport = fakeTransport([{ id: 'a', text: 'back', createdAt: AT }])
    const favorites = createFavoritesStore(transport)
    await favorites.actions.refresh()
    const record = await favorites.actions.remove('a')
    expect(record).not.toBeNull()
    expect(await favorites.actions.restore(record as PromptRecord)).toBe(true)
    expect(favorites.state.getSnapshot().items[0]).toEqual({ id: 'a', text: 'back', createdAt: AT })
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd deepseek-harness-plugin/ui-favorite-prompts && node ../../node_modules/vitest/vitest.mjs run tests/store.spec.ts`
Expected: FAIL — 找不到模块 `../src/client/store.ts`

- [ ] **Step 3: 实现 `src/client/transport.ts`**

```ts
/** HTTP transport of the favorite-prompts route (browser half). */
import { PROMPT_ROUTE, type PromptRecord, type PromptSourceRef } from '../schema.ts'

/** Every call the store makes; tests substitute an in-memory implementation. */
export interface PromptTransport {
  list(): Promise<PromptRecord[]>
  create(text: string, source?: PromptSourceRef): Promise<PromptRecord>
  update(id: string, text: string): Promise<PromptRecord>
  restore(record: PromptRecord): Promise<PromptRecord>
  remove(id: string): Promise<void>
}

interface Answer { ok: boolean; error?: string; items?: PromptRecord[]; item?: PromptRecord }

async function call(path: string, init: RequestInit): Promise<Answer> {
  const response = await fetch(path, {
    headers: { 'content-type': 'application/json' },
    ...init,
  })
  const answer = await response.json() as Answer
  if (!response.ok || answer.ok !== true) throw new Error(answer.error ?? `HTTP ${response.status}`)
  return answer
}

/** The live transport. */
export const promptTransport: PromptTransport = {
  list: async () => (await call(PROMPT_ROUTE, { method: 'GET' })).items ?? [],
  create: async (text, source) => {
    const answer = await call(PROMPT_ROUTE, {
      method: 'POST',
      body: JSON.stringify(source === undefined ? { text } : { text, source }),
    })
    return answer.item as PromptRecord
  },
  update: async (id, text) => {
    const answer = await call(PROMPT_ROUTE, { method: 'PATCH', body: JSON.stringify({ id, text }) })
    return answer.item as PromptRecord
  },
  restore: async (record) => {
    const answer = await call(PROMPT_ROUTE, { method: 'PUT', body: JSON.stringify(record) })
    return answer.item as PromptRecord
  },
  remove: async (id) => {
    await call(`${PROMPT_ROUTE}?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
  },
}
```

- [ ] **Step 4: 实现 `src/client/store.ts`**

```ts
/**
 * Browser-side mirror of the saved-prompt list. The host owns the records; this
 * store owns the derived lookup index both the strip and the trigger read, and
 * rebuilds it in the same step the list changes.
 */
import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { PromptRecord, PromptSourceRef } from '../schema.ts'
import { normalizeText } from './normalize.ts'
import { promptTransport, type PromptTransport } from './transport.ts'

/** Observable state of the saved-prompt list. */
export interface FavoritesState {
  /** `loading` until the first answer; `error` when the route is unreachable. */
  readonly status: 'loading' | 'ready' | 'error'
  readonly items: readonly PromptRecord[]
  /** Normalized text to record; the only membership test the UI performs. */
  readonly byText: ReadonlyMap<string, PromptRecord>
  readonly error?: string
}

/** The complete write set of the store. */
export interface FavoritesActions {
  refresh(): Promise<boolean>
  add(text: string, source?: PromptSourceRef): Promise<boolean>
  update(id: string, text: string): Promise<boolean>
  remove(id: string): Promise<PromptRecord | null>
  restore(record: PromptRecord): Promise<boolean>
}

/** One store handle shared by the strip, the trigger source, and the settings page. */
export interface FavoritesStore {
  readonly state: SnapshotStore<FavoritesState>
  readonly actions: FavoritesActions
}

/**
 * Index the current list by normalized text. The oldest record wins, so a
 * duplicate keeps one stable identity across rebuilds.
 * @param items - current records.
 * @returns the lookup map.
 */
function indexByText(items: readonly PromptRecord[]): ReadonlyMap<string, PromptRecord> {
  const index = new Map<string, PromptRecord>()
  for (const record of [...items].sort((left, right) => left.createdAt - right.createdAt)) {
    const key = normalizeText(record.text)
    if (!index.has(key)) index.set(key, record)
  }
  return index
}

/**
 * Create the store and its actions.
 * @param transport - route transport; tests pass an in-memory double.
 * @returns the shared store handle.
 */
export function createFavoritesStore(transport: PromptTransport = promptTransport): FavoritesStore {
  const state = createSnapshotStore<FavoritesState>({ status: 'loading', items: [], byText: new Map() })

  const publish = (items: readonly PromptRecord[]): void => {
    const sorted = [...items].sort((left, right) => right.createdAt - left.createdAt)
    state.set({ status: 'ready', items: sorted, byText: indexByText(sorted) })
  }

  const refresh = async (): Promise<boolean> => {
    try {
      publish(await transport.list())
      return true
    } catch (error) {
      state.set({
        status: 'error',
        items: [],
        byText: new Map(),
        error: error instanceof Error ? error.message : String(error),
      })
      return false
    }
  }

  const mutate = async (operation: () => Promise<unknown>): Promise<boolean> => {
    try {
      await operation()
    } catch {
      return false
    }
    const current = state.getSnapshot()
    // A failed refresh after a successful write keeps the known list; the next
    // gesture retries.
    if (current.status === 'ready') await refresh()
    return true
  }

  return {
    state,
    actions: {
      refresh,
      add: (text, source) => mutate(() => transport.create(text, source)),
      update: (id, text) => mutate(() => transport.update(id, text)),
      remove: async (id) => {
        const record = state.getSnapshot().items.find(item => item.id === id) ?? null
        if (record === null) return null
        return await mutate(() => transport.remove(id)) ? record : null
      },
      restore: record => mutate(() => transport.restore(record)),
    },
  }
}
```

- [ ] **Step 5: 跑测试确认通过**

Run: `cd deepseek-harness-plugin/ui-favorite-prompts && node ../../node_modules/vitest/vitest.mjs run tests/store.spec.ts`
Expected: PASS（5 个用例）

- [ ] **Step 6: 提交**

```bash
cd deepseek-harness-plugin && git add ui-favorite-prompts && git commit -m "feat(favorite-prompts): 浏览器 transport 与收藏 store"
```

---

### Task 5: 收藏条（Definition + 组件）

**Files:**
- Test: `tests/strip.spec.tsx`
- Create: `src/client/strip/definition.ts`, `src/client/strip/FavoriteStrip.tsx`, `src/client/strip/icons.tsx`, `src/client/strip/FavoriteStrip.module.css`

**Interfaces:**
- Consumes: `createFavoritesStore` 的 `FavoritesState` / `FavoritesActions`（Task 4）；`normalizeText`（Task 2）；词典（Task 1）
- Produces:
  - `const FAVORITE_STRIP_KIND = 'favorite-strip'`
  - `interface FavoriteStripData { readonly text: string; readonly seq: number }`
  - `const favoriteStripDefinition: ConversationNodeDefinition<FavoriteStripData>`
  - `interface FavoriteStripInjected { hooks: { favorites: SnapshotStore<FavoritesState> }; actions: FavoritesActions }`
  - `type FavoriteStripProps = PropsRuntime<'conversation.chat.node', 'favorite-strip'> & PropsLocale<'favoritePrompts'> & InjectFace<FavoriteStripInjected>`
  - `function FavoriteStrip(props: FavoriteStripProps): ReactNode`

- [ ] **Step 1: 写 `src/client/strip/icons.tsx`**

```tsx
/** Bookmark glyphs for the strip; ui-primitives ships no bookmark shape. */
import type { IconProps } from '@deepseek-ai/dsh-client-ui-primitives'

/** Hollow bookmark: this message is not saved. */
export const IconBookmarkOutline16 = ({ size = 16, className }: IconProps) => (
  <svg width={size} height={size} className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M4 1.75h8c.69 0 1.25.56 1.25 1.25v11.2c0 .52-.6.8-1 .48L8 11.4l-4.25 3.28c-.4.31-1 .04-1-.48V3c0-.69.56-1.25 1.25-1.25Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
  </svg>
)

/** Solid bookmark: this message is saved. */
export const IconBookmarkFill16 = ({ size = 16, className }: IconProps) => (
  <svg width={size} height={size} className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M4 1.75h8c.69 0 1.25.56 1.25 1.25v11.2c0 .52-.6.8-1 .48L8 11.4l-4.25 3.28c-.4.31-1 .04-1-.48V3c0-.69.56-1.25 1.25-1.25Z"
      fill="currentColor"
    />
  </svg>
)
```

- [ ] **Step 2: 写 `src/client/strip/definition.ts`**

```ts
/**
 * Bookmark strip: one extra Chat node directly under each user message.
 *
 * ORDERING CONTRACT — the node key is `${kind.length}:${kind}${id}`, and the
 * Chat view orders equal anchors by that key's dictionary order (anchor → rank
 * → originalAnchor → key). The built-in user node is `13:input-message…`, so
 * this kind's 14-character name keeps every strip AFTER its message. Renaming
 * the kind, or moving `anchorSeq` off `event.seq`, moves the strip: a shorter
 * name sorts it above the bubble, and an anchor below the turn's
 * `openingHumanAnchor` folds it into the process group.
 */
import type { ConversationNodeDefinition, ConversationLocation } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { ChatNode } from '@deepseek-ai/dsh-client-ui-chat/client'
import { isAppendSurfaceEvent } from '@deepseek-ai/dsh-session/surface'

/** Renderer dispatch key; see the ordering contract above before changing it. */
export const FAVORITE_STRIP_KIND = 'favorite-strip'

/** Payload of one strip node. */
export interface FavoriteStripData {
  readonly text: string
  readonly seq: number
}

declare module '@deepseek-ai/dsh-client-ui-chat/client' {
  interface ChatNodeDataMap {
    /** Bookmark strip under one user message. */
    'favorite-strip': FavoriteStripData
  }
}

/**
 * Join the text blocks of one message the same way the built-in copy action
 * does, so the saved text is exactly what the user sees.
 * @param content - message content blocks.
 * @returns the joined plain text.
 */
function messageText(content: unknown): string {
  if (!Array.isArray(content)) return ''
  const texts: string[] = []
  for (const block of content) {
    const candidate = block as { type?: string; text?: string }
    if (candidate.type === 'text' && typeof candidate.text === 'string') texts.push(candidate.text)
  }
  return texts.join('')
}

/** One bookmark strip per user-authored message with visible text. */
export const favoriteStripDefinition: ConversationNodeDefinition<FavoriteStripData> = {
  kind: FAVORITE_STRIP_KIND,
  target: 'chat',
  match: (event) => {
    if (event.type !== 'user/message' || !isAppendSurfaceEvent(event)) return null
    if (event.data.source.kind !== 'user') return null
    const text = messageText(event.data.content)
    return text.trim() === '' ? null : { id: String(event.data.id), role: 'start' }
  },
  start: (_context, match) => {
    if (match.event.type !== 'user/message') throw new Error('favorite-strip start requires user/message')
    return { text: messageText(match.event.data.content), seq: match.event.seq }
  },
  update: context => context.state,
  buildViewNode: (context) => {
    if (context.state === undefined || context.start === undefined) return null
    const location: ConversationLocation = context.start.location
    return {
      key: context.key,
      kind: FAVORITE_STRIP_KIND,
      id: context.id,
      target: 'chat',
      anchorSeq: context.start.event.seq,
      location,
      visibility: 'visible',
      data: context.state,
    } satisfies ChatNode<typeof FAVORITE_STRIP_KIND>
  },
}
```

- [ ] **Step 3: 写 `src/client/strip/FavoriteStrip.module.css`**

```css
/* Bookmark strip under a user message. Geometry mirrors the shared message
   action row (MessageIconActions.module.css): 28px hit area, 15px glyph, and
   the same 80ms opacity reveal, so the control reads as part of that row. */

.strip {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  height: calc(28px + var(--dsh-content-font-delta, 0px));
  /* Hug the bubble above without shifting the transcript. */
  margin-top: -4px;
}

.action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: calc(28px + var(--dsh-content-font-delta, 0px));
  height: calc(28px + var(--dsh-content-font-delta, 0px));
  padding: 6px;
  border: none;
  border-radius: 28px;
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  cursor: pointer;
}

.action svg {
  width: calc(15px + var(--dsh-content-font-delta, 0px));
  height: calc(15px + var(--dsh-content-font-delta, 0px));
}

.action:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-secondary);
}

.action[data-saved] {
  color: var(--dsw-alias-label-secondary);
}

.undo {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--dsh-content-font-size-secondary, 13px);
  line-height: calc(20px + var(--dsh-content-font-delta, 0px));
  color: var(--dsw-alias-label-tertiary);
}

.undoButton {
  border: none;
  background: transparent;
  padding: 0;
  font: inherit;
  color: var(--dsw-alias-link);
  cursor: pointer;
}

.undoButton:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-style: dotted;
}

/* Hover reveal: the strip is the next flow row after the message it belongs to,
   so hovering the bubble reveals its bookmark. Without hover the control stays
   visible. Enhancement only — if the attribute ever changes, the resting state
   below still works. */
@media (hover: hover) {
  .strip {
    opacity: 0.35;
    transition: opacity 80ms ease;
  }

  .strip:hover,
  .strip:focus-within,
  [data-chat-flow-kind='user']:hover + [data-chat-flow-kind='favorite-strip'] .strip {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .strip {
    transition: none;
  }
}
```

- [ ] **Step 4: 写 `src/client/strip/FavoriteStrip.tsx`**

```tsx
/** One bookmark strip under a user message, with an inline undo window. */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { PromptRecord } from '../../schema.ts'
import type { FavoritesActions, FavoritesState } from '../store.ts'
import { normalizeText } from '../normalize.ts'
import { IconBookmarkFill16, IconBookmarkOutline16 } from './icons.tsx'
import css from './FavoriteStrip.module.css'

/** How long the inline undo stays available, in ms. */
export const UNDO_WINDOW_MS = 5000

/** Business face injected into the strip registration. */
export interface FavoriteStripInjected {
  hooks: { favorites: SnapshotStore<FavoritesState> }
  actions: FavoritesActions
}

/** Composed props of the strip component. */
export type FavoriteStripProps =
  PropsRuntime<'conversation.chat.node', 'favorite-strip'>
  & PropsLocale<'favoritePrompts'>
  & InjectFace<FavoriteStripInjected>

/**
 * Render the bookmark strip for one message.
 * @param props - node payload, session id, favorites hook and actions, copy.
 * @returns the strip row.
 */
export function FavoriteStrip({ node, sessionId, useFavorites, actions, t }: FavoriteStripProps): ReactNode {
  const key = normalizeText(node.data.text)
  const saved = useFavorites(state => state.byText.get(key))
  const [removed, setRemoved] = useState<PromptRecord | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (timer.current !== null) clearTimeout(timer.current)
  }, [])

  const announce = (text: string): void => {
    setMessage(text)
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setMessage(null)
      setRemoved(null)
    }, UNDO_WINDOW_MS)
  }

  const onToggle = async (): Promise<void> => {
    if (saved === undefined) {
      const ok = await actions.add(node.data.text, { sessionId, seq: node.data.seq })
      announce(ok ? t('strip.added') : t('strip.failed'))
      return
    }
    const record = await actions.remove(saved.id)
    if (record === null) return
    setRemoved(record)
    announce(t('strip.undone'))
  }

  const onUndo = async (): Promise<void> => {
    if (removed === null) return
    await actions.restore(removed)
    setRemoved(null)
  }

  return (
    <div className={css.strip}>
      {message !== null && (
        <span className={css.undo} role="status">
          {message}
          {removed !== null && (
            <button type="button" className={css.undoButton} onClick={() => { void onUndo() }}>
              {t('strip.undo')}
            </button>
          )}
        </span>
      )}
      <button
        type="button"
        className={css.action}
        data-saved={saved === undefined ? undefined : true}
        aria-label={saved === undefined ? t('strip.favorite') : t('strip.unfavorite')}
        aria-pressed={saved !== undefined}
        onClick={() => { void onToggle() }}
      >
        {saved === undefined ? <IconBookmarkOutline16 /> : <IconBookmarkFill16 />}
      </button>
    </div>
  )
}
```

- [ ] **Step 5: 写测试 `tests/strip.spec.tsx`**

```tsx
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { createFavoritesStore } from '../src/client/store.ts'
import { FavoriteStrip, type FavoriteStripProps } from '../src/client/strip/FavoriteStrip.tsx'
import { favoriteStripDefinition, FAVORITE_STRIP_KIND } from '../src/client/strip/definition.ts'
import { zh } from '../src/client/locales.ts'
import type { PromptTransport } from '../src/client/transport.ts'

/** Minimal transport double. */
function transport(rows: PromptRecord[] = []): PromptTransport {
  return {
    list: async () => rows,
    create: async (text, source) => {
      const record = { id: `id${rows.length + 1}`, text, createdAt: 1, ...(source === undefined ? {} : { source }) }
      rows.push(record)
      return record
    },
    update: async (id, text) => ({ id, text, createdAt: 1 }),
    restore: async record => record,
    remove: async (id) => { rows.splice(rows.findIndex(row => row.id === id), 1) },
  }
}

/** Props with the five shares the strip reads; other seats are unused. */
function propsFor(favorites: ReturnType<typeof createFavoritesStore>, text: string): FavoriteStripProps {
  return {
    node: {
      key: 'k', kind: FAVORITE_STRIP_KIND, id: 'm1', target: 'chat', anchorSeq: 3,
      location: { kind: 'unresolved' }, visibility: 'visible', data: { text, seq: 3 },
    },
    sessionId: 's1',
    useFavorites: (selector: (state: ReturnType<typeof favorites.state.getSnapshot>) => unknown) =>
      selector(favorites.state.getSnapshot()),
    actions: favorites.actions,
    t: (key: keyof typeof zh, params?: Record<string, string>) => {
      const template = zh[key] as string
      return params === undefined ? template : template.replace(/\{(\w+)\}/gu, (_, name: string) => params[name] ?? '')
    },
  } as unknown as FavoriteStripProps
}

describe('favoriteStripDefinition', () => {
  it('matches user-authored messages and derives the anchor from the event', () => {
    const event = {
      type: 'user/message', seq: 7, time: 1, surfaceOp: 'append',
      data: { id: 'm7', content: [{ type: 'text', text: 'hello' }], source: { kind: 'user' } },
    }
    expect(favoriteStripDefinition.match(event as never)).toEqual({ id: 'm7', role: 'start' })
  })

  it('ignores plugin-injected context and empty text', () => {
    const injected = {
      type: 'user/message', seq: 8, time: 1, surfaceOp: 'append',
      data: { id: 'm8', content: [{ type: 'text', text: 'ctx' }], source: { kind: 'plugin', plugin: 'x' } },
    }
    const empty = {
      type: 'user/message', seq: 9, time: 1, surfaceOp: 'append',
      data: { id: 'm9', content: [], source: { kind: 'user' } },
    }
    expect(favoriteStripDefinition.match(injected as never)).toBeNull()
    expect(favoriteStripDefinition.match(empty as never)).toBeNull()
  })
})

describe('FavoriteStrip', () => {
  it('saves the message on click', async () => {
    const favorites = createFavoritesStore(transport())
    await favorites.actions.refresh()
    render(<FavoriteStrip {...propsFor(favorites, 'Run the tests')} />)
    await act(async () => { screen.getByRole('button', { name: zh['strip.favorite'] }).click() })
    expect(favorites.state.getSnapshot().items[0]?.text).toBe('Run the tests')
  })

  it('shows the saved state and offers an undo after unfavoriting', async () => {
    const favorites = createFavoritesStore(transport([{ id: 'a', text: 'Run the tests', createdAt: 1 }]))
    await favorites.actions.refresh()
    render(<FavoriteStrip {...propsFor(favorites, 'Run the tests')} />)
    await act(async () => { screen.getByRole('button', { name: zh['strip.unfavorite'] }).click() })
    expect(favorites.state.getSnapshot().items).toHaveLength(0)
    await act(async () => { screen.getByRole('button', { name: zh['strip.undo'] }).click() })
    expect(favorites.state.getSnapshot().items[0]).toEqual({ id: 'a', text: 'Run the tests', createdAt: 1 })
  })

  it('marks the control as saved when the same text lives in another session', async () => {
    const favorites = createFavoritesStore(transport([{ id: 'a', text: 'shared', createdAt: 1 }]))
    await favorites.actions.refresh()
    render(<FavoriteStrip {...propsFor(favorites, 'shared')} />)
    expect(screen.getByRole('button', { name: zh['strip.unfavorite'] })).toBeTruthy()
  })
})
```

- [ ] **Step 6: 跑测试**

Run: `cd deepseek-harness-plugin/ui-favorite-prompts && node ../../node_modules/vitest/vitest.mjs run tests/strip.spec.tsx`
Expected: PASS（5 个用例）。若 jsdom 缺少 `matchMedia` 等 API 导致渲染失败，在测试文件顶部补一个最小 stub，不要改组件。

- [ ] **Step 7: 提交**

```bash
cd deepseek-harness-plugin && git add ui-favorite-prompts && git commit -m "feat(favorite-prompts): 消息下方收藏条（Chat 节点 Definition + 组件 + 行内撤销）"
```

---

### Task 6: `@` 触发源

**Files:**
- Test: `tests/trigger.spec.ts`
- Create: `src/client/trigger/source.ts`

**Interfaces:**
- Consumes: `FavoritesState`（Task 4）、`candidateName` / `previewText`（Task 2）、词典（Task 1）
- Produces: `createFavoritesSource(state: () => FavoritesState, t: Translate): InputTriggerSource`，`CANDIDATE_LIMIT`

- [ ] **Step 1: 写失败测试 `tests/trigger.spec.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { createFavoritesSource, CANDIDATE_LIMIT } from '../src/client/trigger/source.ts'
import { zh } from '../src/client/locales.ts'
import type { FavoritesState } from '../src/client/store.ts'
import type { PromptRecord } from '../src/schema.ts'

const AT = 1_700_000_000_000

function stateOf(items: PromptRecord[]): FavoritesState {
  return {
    status: 'ready',
    items,
    byText: new Map(items.map(item => [item.text, item])),
  }
}

const t = (key: keyof typeof zh): string => zh[key] as string

/** Candidate request with only the fields the source reads. */
function request(query: string) {
  return { query, position: 'inline', drilled: false, signal: new AbortController().signal } as const
}

const session = { sessionId: 's1' } as const

describe('createFavoritesSource', () => {
  const items: PromptRecord[] = [
    { id: 'a', text: 'Run the tests', createdAt: AT },
    { id: 'b', text: '第一条中文提示词\n第二行', createdAt: AT + 10 },
  ]

  it('binds the @ trigger under a unique group name', () => {
    const source = createFavoritesSource(() => stateOf(items), t)
    expect(source.trigger).toBe('@')
    expect(source.name).toBe('favorites')
    expect(source.showGroupTitle).toBe(false)
  })

  it('lists newest first with a localized section heading and a short label', async () => {
    const source = createFavoritesSource(() => stateOf(items), t)
    const candidates = await source.candidates(session, request(''))
    expect(candidates.map(c => c.value)).toEqual(['b', 'a'])
    expect(candidates[0]).toMatchObject({ name: '第一条中文提示词', label: '第一条中文提示词', section: '收藏' })
  })

  it('filters by substring of the whole prompt, case-insensitively', async () => {
    const source = createFavoritesSource(() => stateOf(items), t)
    const candidates = await source.candidates(session, request('TESTS'))
    expect(candidates.map(c => c.value)).toEqual(['a'])
  })

  it('caps the number of rows', async () => {
    const many = Array.from({ length: CANDIDATE_LIMIT + 5 }, (_, index) => ({
      id: `id${index}`, text: `prompt ${index}`, createdAt: AT + index,
    }))
    const source = createFavoritesSource(() => stateOf(many), t)
    expect(await source.candidates(session, request(''))).toHaveLength(CANDIDATE_LIMIT)
  })

  it('inserts the whole prompt text on pick and ignores an unknown id', async () => {
    const source = createFavoritesSource(() => stateOf(items), t)
    const [first] = await source.candidates(session, request(''))
    const outcome = source.onPick({ candidate: first!, session, position: 'inline', via: 'menu', action: 'pick', span: { start: 0, end: 2, draftRev: 1 } } as never)
    expect(outcome).toEqual({ text: '第一条中文提示词\n第二行' })
    const missing = source.onPick({ candidate: { name: 'x', value: 'gone' }, session, position: 'inline', via: 'menu', action: 'pick', span: { start: 0, end: 2, draftRev: 1 } } as never)
    expect(missing).toBeUndefined()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd deepseek-harness-plugin/ui-favorite-prompts && node ../../node_modules/vitest/vitest.mjs run tests/trigger.spec.ts`
Expected: FAIL — 找不到模块 `../src/client/trigger/source.ts`

- [ ] **Step 3: 实现 `src/client/trigger/source.ts`**

```ts
/**
 * `@` trigger source listing saved prompts. The menu's own group title is
 * owned by ui-input-trigger's dictionary, so this source declares no group
 * title and carries a localized `section` heading on every row instead.
 */
import type { InputTriggerSource, InputTriggerCandidate } from '@deepseek-ai/dsh-client-ui-input-trigger/client'
import type { FavoritesState } from '../store.ts'
import { candidateName, previewText } from '../normalize.ts'
import { IconBookmarkOutline16 } from '../strip/icons.tsx'
import type { FavoritePromptsKey } from '../locales.ts'

/** Translation seat of this plugin's dictionary. */
export type Translate = (key: FavoritePromptsKey, params?: Record<string, string>) => string

/** Rows rendered for one query, at most. */
export const CANDIDATE_LIMIT = 50

/**
 * Build the saved-prompt trigger source.
 * @param state - current store snapshot, read per keystroke.
 * @param t - dictionary-bound translator.
 * @returns the source registered on `ctx.inputTriggers`.
 */
export function createFavoritesSource(state: () => FavoritesState, t: Translate): InputTriggerSource {
  return {
    trigger: '@',
    name: 'favorites',
    order: 100,
    showGroupTitle: false,
    candidates: (_session, req) => {
      const query = req.query.trim().toLowerCase()
      const items = [...state().items].sort((left, right) => right.createdAt - left.createdAt)
      const matched = query === '' ? items : items.filter(item => item.text.toLowerCase().includes(query))
      const taken = new Set<string>()
      const rows: InputTriggerCandidate[] = matched.slice(0, CANDIDATE_LIMIT).map((item) => {
        const name = candidateName(item.text, taken)
        taken.add(name)
        return {
          name,
          label: name,
          description: previewText(item.text, 60),
          section: t('group'),
          icon: IconBookmarkOutline16,
          value: item.id,
        }
      })
      return Promise.resolve(rows)
    },
    onPick: (pick) => {
      const id = pick.candidate.value
      const record = id === undefined ? undefined : state().items.find(item => item.id === id)
      return record === undefined ? undefined : { text: record.text }
    },
  }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd deepseek-harness-plugin/ui-favorite-prompts && node ../../node_modules/vitest/vitest.mjs run tests/trigger.spec.ts`
Expected: PASS（5 个用例）

- [ ] **Step 5: 提交**

```bash
cd deepseek-harness-plugin && git add ui-favorite-prompts && git commit -m "feat(favorite-prompts): @ 触发源，选中整段插入提示词"
```

---

### Task 7: 设置页

**Files:**
- Test: `tests/settings.spec.tsx`
- Create: `src/client/settings/FavoritesSettingsPage.tsx`, `src/client/settings/FavoritesSettingsPage.module.css`

**Interfaces:**
- Consumes: `FavoritesState` / `FavoritesActions`（Task 4）、词典（Task 1）
- Produces: `type FavoritesSettingsProps = PropsRuntime<'settings.section'> & PropsLocale<'favoritePrompts'> & InjectFace<FavoritesSettingsInjected>`、`function FavoritesSettingsPage(props): ReactNode`

- [ ] **Step 1: 写 `src/client/settings/FavoritesSettingsPage.module.css`**

```css
/* Saved-prompt management page. Rows stack in the settings content column;
   controls are hand-rolled except Button, because ui-primitives ships no list,
   textarea, or empty state. */

.page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.toolbar {
  display: flex;
  justify-content: flex-end;
}

.notice {
  font-size: var(--dsh-content-font-size-secondary, 13px);
  line-height: calc(20px + var(--dsh-content-font-delta, 0px));
  color: var(--dsw-alias-label-tertiary);
}

.empty {
  padding: 24px 0;
  font-size: var(--dsh-content-font-size-secondary, 13px);
  line-height: calc(22px + var(--dsh-content-font-delta, 0px));
  color: var(--dsw-alias-label-tertiary);
}

.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 12px;
  border: 0.5px solid var(--dsw-alias-border-l3);
  border-radius: 10px;
}

.rowBody {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.text {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: var(--dsh-content-font-size-secondary, 13px);
  line-height: calc(20px + var(--dsh-content-font-delta, 0px));
  color: var(--dsw-alias-label-primary);
}

.meta {
  font-size: var(--dsh-content-font-size-secondary, 13px);
  color: var(--dsw-alias-label-tertiary);
}

.rowActions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.editor {
  width: 100%;
  box-sizing: border-box;
  min-height: 96px;
  resize: vertical;
  padding: 8px 10px;
  border: 0.5px solid var(--dsw-alias-border-l3);
  border-radius: 8px;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font-family: inherit;
  font-size: var(--dsh-content-font-size-secondary, 13px);
  line-height: calc(20px + var(--dsh-content-font-delta, 0px));
}

.editor:focus-visible {
  outline: 2px solid var(--dsw-alias-border-l3);
  outline-offset: 1px;
}
```

- [ ] **Step 2: 写 `src/client/settings/FavoritesSettingsPage.tsx`**

```tsx
/** Settings page managing the saved-prompt list. */
import { useState, type ReactNode } from 'react'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { FavoritesActions, FavoritesState } from '../store.ts'
import css from './FavoritesSettingsPage.module.css'

/** Business face injected into the settings registration. */
export interface FavoritesSettingsInjected {
  hooks: { favorites: SnapshotStore<FavoritesState> }
  actions: FavoritesActions
}

/** Composed props of the settings page. */
export type FavoritesSettingsProps =
  PropsRuntime<'settings.section'>
  & PropsLocale<'favoritePrompts'>
  & InjectFace<FavoritesSettingsInjected>

/** Which row is being edited or confirmed for deletion. */
interface RowState {
  editingId: string | null
  draft: string
  confirmingId: string | null
  adding: boolean
}

/**
 * Render the management page: edit, delete, and add saved prompts.
 * @param props - favorites hook and actions, plus the locale seat.
 * @returns the page body.
 */
export function FavoritesSettingsPage({ useFavorites, actions, t }: FavoritesSettingsProps): ReactNode {
  const status = useFavorites(state => state.status)
  const error = useFavorites(state => state.error)
  const items = useFavorites(state => state.items)
  const [row, setRow] = useState<RowState>({ editingId: null, draft: '', confirmingId: null, adding: false })

  const startEdit = (id: string, text: string): void => {
    setRow({ editingId: id, draft: text, confirmingId: null, adding: false })
  }

  const submitEdit = async (): Promise<void> => {
    if (row.editingId === null || row.draft.trim() === '') return
    await actions.update(row.editingId, row.draft)
    setRow({ editingId: null, draft: '', confirmingId: null, adding: false })
  }

  const submitAdd = async (): Promise<void> => {
    if (row.draft.trim() === '') return
    await actions.add(row.draft)
    setRow({ editingId: null, draft: '', confirmingId: null, adding: false })
  }

  const onDelete = async (id: string): Promise<void> => {
    if (row.confirmingId !== id) {
      setRow(current => ({ ...current, confirmingId: id, editingId: null }))
      return
    }
    await actions.remove(id)
    setRow({ editingId: null, draft: '', confirmingId: null, adding: false })
  }

  if (status === 'loading') return <div className={css.notice}>{t('settings.loading')}</div>
  if (status === 'error') return <div className={css.notice}>{t('settings.unavailable', { reason: error ?? '' })}</div>

  const editing = row.editingId !== null || row.adding

  return (
    <div className={css.page}>
      <div className={css.toolbar}>
        <Button
          variant="outline"
          size="sm"
          disabled={editing}
          onClick={() => { setRow({ editingId: null, draft: '', confirmingId: null, adding: true }) }}
        >
          {t('settings.new')}
        </Button>
      </div>

      {row.adding && (
        <div className={css.rowBody}>
          <textarea
            className={css.editor}
            value={row.draft}
            placeholder={t('settings.placeholder')}
            onChange={(event) => { setRow(current => ({ ...current, draft: event.target.value })) }}
          />
          <div className={css.rowActions}>
            <Button variant="primary" size="sm" onClick={() => { void submitAdd() }}>{t('settings.save')}</Button>
            <Button variant="ghost" size="sm" onClick={() => { setRow({ editingId: null, draft: '', confirmingId: null, adding: false }) }}>
              {t('settings.cancel')}
            </Button>
          </div>
        </div>
      )}

      {items.length === 0 && !row.adding
        ? <div className={css.empty}>{t('settings.empty')}</div>
        : (
          <ul className={css.list}>
            {items.map(item => (
              <li key={item.id} className={css.row}>
                <div className={css.rowBody}>
                  {row.editingId === item.id
                    ? (
                      <textarea
                        className={css.editor}
                        value={row.draft}
                        onChange={(event) => { setRow(current => ({ ...current, draft: event.target.value })) }}
                      />
                    )
                    : (
                      <>
                        <span className={css.text}>{item.text}</span>
                        <span className={css.meta}>{t('settings.createdAt', { time: new Date(item.createdAt).toLocaleString() })}</span>
                      </>
                    )}
                </div>
                <div className={css.rowActions}>
                  {row.editingId === item.id
                    ? (
                      <>
                        <Button variant="primary" size="sm" onClick={() => { void submitEdit() }}>{t('settings.save')}</Button>
                        <Button variant="ghost" size="sm" onClick={() => { setRow({ editingId: null, draft: '', confirmingId: null, adding: false }) }}>
                          {t('settings.cancel')}
                        </Button>
                      </>
                    )
                    : (
                      <>
                        <Button variant="ghost" size="sm" disabled={editing} onClick={() => { startEdit(item.id, item.text) }}>
                          {t('settings.edit')}
                        </Button>
                        <Button variant={row.confirmingId === item.id ? 'primary' : 'ghost'} size="sm" disabled={editing} onClick={() => { void onDelete(item.id) }}>
                          {row.confirmingId === item.id ? t('settings.confirmDelete') : t('settings.delete')}
                        </Button>
                      </>
                    )}
                </div>
              </li>
            ))}
          </ul>
        )}
    </div>
  )
}
```

- [ ] **Step 3: 写测试 `tests/settings.spec.tsx`**

```tsx
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { createFavoritesStore } from '../src/client/store.ts'
import { FavoritesSettingsPage, type FavoritesSettingsProps } from '../src/client/settings/FavoritesSettingsPage.tsx'
import { zh } from '../src/client/locales.ts'
import type { PromptRecord } from '../src/schema.ts'
import type { PromptTransport } from '../src/client/transport.ts'

function transport(rows: PromptRecord[]): PromptTransport {
  return {
    list: async () => rows,
    create: async (text) => { const record = { id: 'new', text, createdAt: 9 }; rows.push(record); return record },
    update: async (id, text) => {
      const index = rows.findIndex(row => row.id === id)
      const next = { ...rows[index] as PromptRecord, text }
      rows[index] = next
      return next
    },
    restore: async record => record,
    remove: async (id) => { rows.splice(rows.findIndex(row => row.id === id), 1) },
  }
}

function propsFor(favorites: ReturnType<typeof createFavoritesStore>): FavoritesSettingsProps {
  return {
    close: () => {},
    useFavorites: (selector: (state: ReturnType<typeof favorites.state.getSnapshot>) => unknown) =>
      selector(favorites.state.getSnapshot()),
    actions: favorites.actions,
    t: (key: keyof typeof zh, params?: Record<string, string>) => {
      const template = zh[key] as string
      return params === undefined ? template : template.replace(/\{(\w+)\}/gu, (_, name: string) => params[name] ?? '')
    },
  } as unknown as FavoritesSettingsProps
}

describe('FavoritesSettingsPage', () => {
  it('shows the empty state when nothing is saved', async () => {
    const favorites = createFavoritesStore(transport([]))
    await favorites.actions.refresh()
    render(<FavoritesSettingsPage {...propsFor(favorites)} />)
    expect(screen.getByText(zh['settings.empty'])).toBeTruthy()
  })

  it('edits one record in place', async () => {
    const favorites = createFavoritesStore(transport([{ id: 'a', text: 'old', createdAt: 1 }]))
    await favorites.actions.refresh()
    render(<FavoritesSettingsPage {...propsFor(favorites)} />)
    await act(async () => { screen.getByRole('button', { name: zh['settings.edit'] }).click() })
    const editor = screen.getByRole('textbox') as HTMLTextAreaElement
    await act(async () => {
      editor.value = 'new'
      editor.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => { screen.getByRole('button', { name: zh['settings.save'] }).click() })
    expect(favorites.state.getSnapshot().items[0]?.text).toBe('new')
  })

  it('deletes only after the second click', async () => {
    const favorites = createFavoritesStore(transport([{ id: 'a', text: 'bye', createdAt: 1 }]))
    await favorites.actions.refresh()
    render(<FavoritesSettingsPage {...propsFor(favorites)} />)
    await act(async () => { screen.getByRole('button', { name: zh['settings.delete'] }).click() })
    expect(favorites.state.getSnapshot().items).toHaveLength(1)
    await act(async () => { screen.getByRole('button', { name: zh['settings.confirmDelete'] }).click() })
    expect(favorites.state.getSnapshot().items).toHaveLength(0)
  })

  it('adds a prompt typed by hand', async () => {
    const favorites = createFavoritesStore(transport([]))
    await favorites.actions.refresh()
    render(<FavoritesSettingsPage {...propsFor(favorites)} />)
    await act(async () => { screen.getByRole('button', { name: zh['settings.new'] }).click() })
    const editor = screen.getByPlaceholderText(zh['settings.placeholder']) as HTMLTextAreaElement
    await act(async () => {
      editor.value = '手写的提示词'
      editor.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => { screen.getByRole('button', { name: zh['settings.save'] }).click() })
    expect(favorites.state.getSnapshot().items[0]?.text).toBe('手写的提示词')
  })
})
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd deepseek-harness-plugin/ui-favorite-prompts && node ../../node_modules/vitest/vitest.mjs run tests/settings.spec.tsx`
Expected: PASS（4 个用例）

- [ ] **Step 5: 提交**

```bash
cd deepseek-harness-plugin && git add ui-favorite-prompts && git commit -m "feat(favorite-prompts): 设置页管理收藏（增删改 + 空状态）"
```

---

### Task 8: 装配、构建与真实环境验证

**Files:**
- Modify: `src/client/index.ts`（替换 Task 1 的临时实现）
- Create: `tests/registration.spec.ts`（注册与拆除）

**Interfaces:**
- Consumes: 前面所有 Task 的产物
- Produces: 可安装运行的完整插件

- [ ] **Step 1: 写注册测试 `tests/registration.spec.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import { apply, inject } from '../src/client/index.ts'

/** Boot a client context with a real slot registry and the services apply needs. */
async function bench(): Promise<Context> {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry)
  ctx.provide('locale', {
    register: () => () => {},
    bind: () => (key: string) => key,
  } as never)
  const sources: unknown[] = []
  ctx.provide('inputTriggers', {
    registerSource: (source: unknown) => { sources.push(source); return () => { sources.splice(sources.indexOf(source), 1) } },
    sessionOf: () => { throw new Error('unused') },
  } as never)
  ctx.provide('uiConversation', { events: { register: () => () => {} } } as never)
  return ctx
}

describe('browser half registration', () => {
  it('declares the services it reads', () => {
    expect(inject).toEqual(expect.arrayContaining(['slots', 'locale', 'uiConversation', 'inputTriggers']))
  })

  it('registers the @ source and removes it on disposal', async () => {
    const ctx = await bench()
    const fiber = await ctx.plugin({ apply, inject })
    expect(ctx.get('inputTriggers')).toBeTruthy()
    await fiber.dispose()
  })
})
```

- [ ] **Step 2: 写真实 `src/client/index.ts`**

```ts
/**
 * Favorite-prompts browser half: one store mirrored from the host, contributed
 * to three independent seats — the Chat node seat (bookmark strip), the input
 * trigger registry (`@` group), and the Settings section (management page).
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-input-trigger/client'
import { FavoritesSettingsPage } from './settings/FavoritesSettingsPage.tsx'
import { FavoriteStrip } from './strip/FavoriteStrip.tsx'
import { favoriteStripDefinition, FAVORITE_STRIP_KIND } from './strip/definition.ts'
import { createFavoritesSource } from './trigger/source.ts'
import { createFavoritesStore } from './store.ts'
import { en, NS, zh } from './locales.ts'
import type { InputTriggerServiceContract } from '@deepseek-ai/dsh-client-ui-input-trigger/client'

/** Services the browser half reads. */
export const inject = ['slots', 'locale', 'uiConversation', 'inputTriggers']

/** Wire the store and the three contributions. */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'favorite-prompts: dictionaries')
  const t = ctx.locale.bind(NS)

  const favorites = createFavoritesStore()
  void favorites.actions.refresh()

  // Multi-tab consistency without a push channel: refetch when the page regains
  // focus.
  ctx.effect(() => {
    const onFocus = (): void => { void favorites.actions.refresh() }
    window.addEventListener('focus', onFocus)
    return () => { window.removeEventListener('focus', onFocus) }
  }, 'favorite-prompts: focus refresh')

  // 1. Bookmark strip under every user message.
  ctx.uiConversation.events.register(favoriteStripDefinition)
  ctx.slots.inject('conversation.chat.node', () => ctx.slots.register({
    name: 'conversation.chat.node',
    key: FAVORITE_STRIP_KIND,
    locale: NS,
    inject: () => ({ hooks: { favorites: favorites.state }, actions: favorites.actions }),
  }, FavoriteStrip))

  // 2. `@` group listing saved prompts.
  const inputTriggers = ctx.get('inputTriggers') as InputTriggerServiceContract | undefined
  if (inputTriggers !== undefined) {
    ctx.effect(
      () => inputTriggers.registerSource(createFavoritesSource(() => favorites.state.getSnapshot(), t)),
      'favorite-prompts: @ source',
    )
  }

  // 3. Settings page.
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'favorite-prompts',
    order: 30,
    label: () => t('nav'),
    locale: NS,
    inject: () => ({ hooks: { favorites: favorites.state }, actions: favorites.actions }),
  }, FavoritesSettingsPage))
}
```

- [ ] **Step 3: 全量测试 + 构建**

Run: `cd deepseek-harness-plugin/ui-favorite-prompts && node ../../node_modules/vitest/vitest.mjs run && npx tsc -b && npx tsdown --config-loader tsx`
Expected: 所有 spec PASS；`tsc` 与 `tsdown` 无错；`lib/index.js`、`lib/client.js` 刷新。

- [ ] **Step 4: 安装到 web profile 并重启**

```bash
cd deepseek-harness
dsh plugin --profile web add link:/Users/liyu/Documents/www/DeepSeek/deepseek-harness/deepseek-harness-plugin/ui-favorite-prompts
```

然后重启 `dsh web`（profile 的 insert 行在启动时读取）。

- [ ] **Step 5: 按设计 §11 的手测清单逐条验证**

1. 发一条消息 → 消息下方出现收藏条，悬停气泡时浮现 → 点击 → toast「已收藏」，且 `$DSH_HOME/storages/favorite_prompts/prompts/` 下出现新 JSON 文件。
2. 输入框打 `@` → 出现「收藏」分组 → 选中 → 提示词整段插入且可继续编辑 → 发送成功。
3. 设置 → 收藏提示词：改一条、删一条、手动加一条；重启 dsh 后仍在。
4. 再点已收藏消息的书签 → 取消收藏；5 秒内点「撤销」→ 记录按原 id/createdAt 回来、顺序不变。
5. 另一个会话里发同一条提示词（或从别处粘贴、带 CRLF）→ 该消息书签直接是实心。
6. Tab 到书签按钮 → 焦点环可见；系统开启"减弱动效"后无透明度过渡。
7. 手动把某条 JSON 改坏 → 重启 → 该条被挪走、其余正常（宿主日志有记录）。

- [ ] **Step 6: 更新设计文档中因实现而定的细节**

若 `DESIGN.md` 的 §4.4 接口表与本计划 Task 3 的实际协议不一致（本计划新增了 `PUT` 用于撤销、`DELETE` 用查询参数），以代码为准更新设计文档的接口表，并在 §5.4 注明撤销走 `PUT`。

- [ ] **Step 7: 提交**

```bash
cd deepseek-harness-plugin && git add ui-favorite-prompts && git commit -m "feat(favorite-prompts): 装配三个扩展点并完成真实环境验证"
```

---

## Self-Review

**1. Spec 覆盖**

| 设计章节 | 覆盖它的 Task |
|---|---|
| §3 包形态与安装 | Task 1（骨架、manifest、构建）、Task 8（安装与验证） |
| §4.1–4.3 存储与 Host 半边 | Task 3 |
| §4.4 HTTP 接口 | Task 3（`PUT` 为本计划新增，Step 6 回写设计） |
| §5.1–5.2 收藏条机制与排序 | Task 5（definition） |
| §5.3 渲染与交互 | Task 5（组件 + CSS） |
| §5.4 撤销窗口 | Task 5（`UNDO_WINDOW_MS`）、Task 4（`restore`）、Task 3（`PUT`） |
| §5.5 归一化判定 | Task 2（纯函数）、Task 4（派生索引） |
| §6 `@` 触发源 | Task 6 |
| §7 设置页 | Task 7 |
| §8 跨组件共享状态 | Task 4（store）、Task 8（装配） |
| §9.1 文案 | Task 1（词典）、各 Task 用 `t` |
| §9.2 样式规范 | Task 5、Task 7 的 CSS |
| §10 失败与边界 | Task 3（错误码）、Task 4（error 状态）、Task 5/7（失败呈现） |
| §11 验证计划 | 各 Task 的测试 + Task 8 Step 5 |
| §12 已知限制 | 无需实现 |

**2. 占位符扫描**：无 TBD/TODO；每个代码步骤都是完整文件内容。

**3. 类型一致性**：`PromptRecord`/`PromptSourceRef` 只在 `src/schema.ts` 定义一次；`FavoritesState`/`FavoritesActions` 只由 `store.ts` 定义，Task 5/7 通过 `InjectFace` 复用；`PromptTable` 由 `src/host/route.ts` 定义并被 `src/index.ts` 以 `as unknown as PromptTable` 适配（存储域 `KvTable` 的同名方法签名一致）；`FAVORITE_STRIP_KIND`、`CANDIDATE_LIMIT`、`UNDO_WINDOW_MS` 各自单一来源。

---

## 实施偏差记录

执行中与计划的偏离记在这里，包含原因，避免后人照着过时的计划走。

### D1（Task 1）：`LocaleNamespaceMap` 模块增强必须放在已 import 该模块的文件里

计划把 `declare module '@deepseek-ai/dsh-client-ui-slots'` 放在 `src/client/locales.ts`。实测失败：

- 只有 `declare module` 而没有该模块的 `import` 时，`tsc -b` 报 `TS6305: Output file .../ui-slots/lib/types/index.d.ts has not been built from source file .../ui-slots/src/index.ts`（项目引用图里无法建立"源 → 输出"的映射）。
- 把路径改成已构建的 `lib/types/index.d.ts`、或删掉该 `references` 项，会分别退化成 `TS2664`（模块无法解析）与把 harness 源码拉进本程序（`TS6059/TS6307`）。

**采用 dev-dock 的写法**：增强块放在 `src/client/index.ts`，并在同文件写一行 `import type {} from '@deepseek-ai/dsh-client-ui-slots'`。`tsconfig.json` 里 `@deepseek-ai/dsh-client-ui-slots` 路径指向 `packages/client/ui-slots/src/index.ts`，并保留该项目引用。

### D2（Task 1）：`tsconfig.json` 保留显式 `paths` 与 `references`

计划里的精简版（只有 `references`，靠 harness 根 `tsconfig.base.json` 的 `paths`）同样触发 D1 的错误；按 chrome-browser 的形态，在插件自己的 `tsconfig.json` 中显式声明所需 `paths`（指向 harness 源码）并保留对应 `references`。

### D3（Task 1）：构建期依赖用软链，`node_modules` 不入库

仓库 `.gitignore` 忽略 `node_modules/`，因此 `react`/`react-dom`/`zod`/`@testing-library/react` 与各 `@deepseek-ai/*` 都通过软链指向 harness 工作区（`@deepseek-ai/*` → `packages/...`，第三方 → `node_modules/.pnpm/...`）。换机器重建时需要按 Task 1 Step 10 重新建链。
