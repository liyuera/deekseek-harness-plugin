# devDock 插件实现计划

> 将 devDock（前端工程管理桌面工具）的精选功能移植为 dsh 插件。
> 独立仓库：`deepseek-harness-plugin/`（GitHub 单独管理，位于 deepseek-harness 工作区根）。
> 完全符合 dsh 插件规范（slot 系统、工具契约、settings 能力、权限模型），不参考 devDock 实现。

## 0. 功能规格（已与用户确认）

| 编号 | 功能 | 说明 |
|---|---|---|
| F1 | 项目导入 + AI 分析 | 用户导入目录 → 插件确定性扫描返回候选信号 → AI 判定前端工程并分析（类型/包管理器/Node 版本/scripts/构建命令/别名）→ 保存 |
| F2 | 编辑器检测 | 自动检测（WebStorm/VS Code/IDEA/Cursor/Sublime/HBuilderX）+ 手动配置路径；一键启动时多选 |
| F3 | 一键启动 | dsh Web GUI 页面：多选项目入启动列表，每项编辑器多选 + 命令单选，保存方案，一键执行 |
| F4 | 单项目操作 | 系统终端运行命令 / 指定编辑器打开项目 |
| F5 | 项目删除 | 仅删插件内配置，级联清理一键启动引用，绝不碰磁盘文件 |

全局规则：所有命令进**系统终端窗口**（不用 dsh 内置终端）；macOS Terminal.app（iTerm 可配）/ Windows Windows Terminal → cmd 降级；不管理 Node 版本管理器（包管理器由 AI 分析，命令精准拼接）；权限按 dsh 当前权限（full access 免审批，其余审批）；macOS + Windows 双平台。

## 1. 技术决策（已通过架构调查验证）

| 决策点 | 结论 | 依据 |
|---|---|---|
| 插件位置 | `deepseek-harness-plugin/dev-dock/`，包名 `@liyuera/dsh-dev-dock` | 仓库 README 约定"每个插件一个目录" |
| 构建 | 借用 harness 的 `clientBundle` 预设（相对路径 `../../packages/client/tsdown.client.ts`），`tsc -b && tsdown --env.DSH_BUILD_FACE=client` | ui-subagent-sidebar 模板 |
| 依赖解析 | `@deepseek-ai/*` 全部声明 peerDependencies，运行时由 harness 的 healed `$DSH_HOME/profiles/node_modules` 回退解析 | app-boot `profile.ts:204-239`；ui-subagent-sidebar package.json 先例 |
| 数据存储 | settings 能力：注册 `dev-dock` namespace，持久化于 `$DSH_HOME/settings.yaml` | `ctx.settings.register(settingsNamespace('dev-dock'), schema)` |
| client 读数据 | `ctx.settingsScope.bind({ namespace, decode })` → get/watch/update + `ctx.remote.$on('settings/document-updated')` | ui-settings `settings-scope.ts:245-269` |
| host 执行系统命令 | `runNativeCommand`（`@deepseek-ai/dsh-native-command`，public，execFile 无 shell） | `native-command/src/index.ts:25-44` |
| UI 入口位置 | `sidebar.footer.action` slot（设置行上方，占满整行） | ui-sidebar `SidebarRoot.tsx:181-189`、`contract/slots.ts:35` |
| 抽屉 | `shell.overlay` slot（帧级右停靠面板） | ui-subagent-sidebar 先例；ui-primitives Modal 参考 |
| UI→agent 动作 | `Session.prompt(content, 'queue' \| 'steer')`——UI 按钮触发 agent 调工具，权限走工具管线 | client runtime `session.ts:190` |
| 权限 | 工具内 `ctx.approval.request(...)`；读策略 `effectiveApprovalPolicy(session.events)` 与 `ctx.sandboxPolicy.resolve({session}).mode` | user-approval `index.ts:257-276` |
| 工具注册 | `ctx.tools.register(defineTool({...}))` | adding-a-tool.md |
| 跨平台开 IDE | macOS `open -a <App> <path>`；Windows `start "" <path>`（cmd） | native-path-opener 先例 |
| 跨平台开终端 | macOS osascript Terminal.app（iTerm 降级）；Windows `wt -d` → `cmd /K` | directory-picker-native osascript 先例 |

## 2. 仓库结构

```
deepseek-harness-plugin/
├── README.md                        # 更新插件列表
└── dev-dock/                        # @liyuera/dsh-dev-dock
    ├── package.json                 # dsh.bundle + dsh.client + peerDeps + exports
    ├── cordis.patch.yml             # insert: host 行 + client 行
    ├── tsconfig.json                # extends ../../tsconfig.base.client.json + paths
    ├── tsdown.config.ts             # clientBundle('@liyuera/dsh-dev-dock', [...])
    ├── src/
    │   ├── index.ts                 # node 半：apply（工具 + settings + invariant）
    │   ├── invariant.ts             # 运行时不变量（注册 manifest 名）
    │   ├── css-modules.d.ts
    │   ├── schema.ts                # settings namespace schema + 类型
    │   ├── tools/
    │   │   ├── scan.ts              # dev-dock_scan-candidates
    │   │   ├── project.ts           # save/list/remove
    │   │   ├── editors.ts           # dev-dock_list-editors
    │   │   └── actions.ts           # open-ide / open-terminal / quick-start
    │   ├── platform/
    │   │   ├── editors-darwin.ts    # mdfind / Applications 检测
    │   │   ├── editors-win32.ts     # 注册表 / where 检测
    │   │   ├── open-ide.ts          # open -a / start
    │   │   ├── open-terminal.ts     # osascript / wt / cmd
    │   │   └── runner.ts            # runNativeCommand 封装 + 平台注入
    │   └── client/
    │       ├── index.ts             # apply：locale + slots 注册
    │       ├── locales.ts           # zh/en
    │       ├── stores.ts            # defineStore：抽屉开合/导航/导入向导状态
    │       ├── api.ts               # settingsScope.bind 封装 + session prompt 封装
    │       ├── DevDockEntry.tsx     # sidebar.footer.action 入口行
    │       ├── DevDockDrawer.tsx    # shell.overlay 右停靠抽屉
    │       ├── DevDockEntry.module.css
    │       ├── DevDockDrawer.module.css
    │       └── pages/
    │           ├── ProjectListPage.tsx      # 项目列表（+导入入口+删除）
    │           ├── ProjectDetailPage.tsx    # 项目详情（脚本/命令/编辑器/打开）
    │           ├── QuickStartPage.tsx       # 一键启动配置页
    │           └── ImportPage.tsx           # 导入向导（选目录→分析→确认）
    ├── tests/
    │   ├── scan.spec.ts             # 候选信号扫描（fixture 目录）
    │   ├── schema.spec.ts           # settings schema 校验
    │   ├── editors.spec.ts          # 检测逻辑（平台注入）
    │   ├── actions.spec.ts          # open-ide/terminal 命令拼接 + 权限
    │   ├── browser-plugin.client.spec.ts  # client apply：slot 注册/HMR
    │   └── pages.client.spec.tsx    # 页面组件（props 直喂）
    └── README.md                    # Model Experience + Known Limitations
```

## 3. 数据模型（settings namespace `dev-dock`）

```ts
interface DevDockSettings {
  projects: ProjectRecord[]          // 项目注册表
  editors: EditorRecord[]            // 编辑器（检测结果 + 手动配置合并）
  quickStarts: QuickStartPlan[]      // 一键启动方案（可多套）
  terminalApp: 'default' | 'iterm'   // macOS 终端选择
}

interface ProjectRecord {
  id: string                        // 稳定 id（路径 hash 或递增）
  name: string
  path: string                      // 绝对路径，唯一键
  alias?: string
  type: 'node' | 'uniapp' | 'miniapp'
  packageManager: 'npm' | 'pnpm' | 'yarn'
  nodeVersion?: string              // AI 从 .nvmrc/engines 分析
  scripts: Record<string, string>   // package.json scripts
  buildCommand?: string
  createdAt: string
}

interface EditorRecord {
  name: string                      // WebStorm / VS Code / ...
  detectedPath?: string             // 自动检测结果
  manualPath?: string               // 用户手动配置（HBuilderX 必需）
}

interface QuickStartPlan {
  name: string                      // 方案名（如 "日常开发"）
  items: Array<{
    projectId: string
    ides: string[]                  // 编辑器多选
    script?: string                 // 命令单选（scripts 中的一项）
  }>
}
```

schema 用 `@deepseek-ai/schemastery` 的 `z` 定义（host 半注册）；client 半经 `settingsScope.bind` 用轻量 decode（JSON 校验）读取。

## 4. Host 半设计

### 4.1 工具清单（8 个，全部 `defineTool` 注册）

| 工具 | 参数 | 行为 | 权限 |
|---|---|---|---|
| `dev-dock_scan-candidates` | `dir: string` | 确定性扫描：目录自身 + 直接子目录，返回信号（有无 package.json/manifest.json、lock 类型、.nvmrc、关键依赖 vue/react/taro） | 无（只读） |
| `dev-dock_save-project` | `project: ProjectRecord` | 保存/更新覆盖（path 唯一） | 无 |
| `dev-dock_list-projects` | — | 返回全部项目 | 无 |
| `dev-dock_remove-project` | `projectId: string` | 删除项目 + 级联清理 quickStarts 引用 | 无（提示性） |
| `dev-dock_list-editors` | — | 自动检测 + 手动配置合并返回 | 无 |
| `dev-dock_open-ide` | `projectId: string, editor?: string` | 检测安装/已打开 → 打开（默认取项目 type 对应编辑器） | ✅ |
| `dev-dock_open-terminal` | `projectId: string, command?: string` | 系统终端窗口打开项目目录，可选执行命令（包管理器精准拼接 `pnpm run X`） | ✅ |
| `dev-dock_quick-start` | `plan?: string` | 按方案执行：IDE 逐个打开（300ms 间隔）+ 终端命令 fire-and-forget | ✅ 一次性整体确认 |

### 4.2 权限策略（F4/F5 相关工具）

- 读取当前策略：`effectiveApprovalPolicy(session.events)`（`ask`/`never`）+ `ctx.sandboxPolicy.resolve({ session }).mode`（`read-only`/`workspace-write`/`danger-full-access`）
- `never`（full access 预设）→ 直接执行；`ask` → `ctx.approval.request({ agent, toolName, reason, signal })`
- `dev-dock_quick-start` 的 reason 汇总全部动作（"将为 N 个项目打开 IDE、启动 M 条命令"），一次审批
- 拒绝时返回明确错误（`{ ok: false, error: 'APPROVAL_REJECTED' }`），不静默

### 4.3 平台层（`src/platform/`，全部可注入测试）

- **编辑器检测**：darwin → `mdfind "kMDItemContentType == 'com.apple.application-bundle' && kMDItemFSName == '<App>.app'"` + `/Applications`、`~/Applications` 文件系统回退；win32 → 注册表 `HKCU\Software\Microsoft\Windows\CurrentVersion\App Paths\<exe>`（webstorm64.exe、Code.exe、idea64.exe、cursor.exe、sublime_text.exe）+ `where <exe>` 回退
- **打开 IDE**：darwin → `open -a "<App>" "<path>"`（HBuilderX 用配置路径）；win32 → `start "" "<exe>" "<path>"`（cmd /c start，经 runNativeCommand 的 cmd 参数数组）
- **打开终端**：darwin → osascript `tell application "Terminal" to do script "cd \"<path>\" && <cmd>"`（失败降级 iTerm；iTerm 为配置项）；win32 → `wt -d "<path>" cmd /K "<cmd>"`（`wt` 缺失降级 `cmd /K`）
- 所有命令走 `runNativeCommand`（execFile 参数数组，无 shell 拼接，防注入）

### 4.4 服务与生命周期

- `export const name = 'dev-dock'`；`inject = ['tools', 'settings', 'approval', 'sandboxPolicy', 'agents']`（按需）
- 注册 settings namespace（`ctx.settings.register`）
- 注册 8 个工具（`ctx.tools.register`，effect 自动卸载）
- `src/invariant.ts`：注册 manifest 名 + 真实不变量（如"保存的项目必在 settings 中可读回"）

## 5. Client 半设计

### 5.1 注册（`src/client/index.ts`）

```ts
export const inject = ['slots', 'locale', 'settingsScope', 'remote', 'sessions']

export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }))
  const store = createDevDockStore()
  // 入口行：设置行上方，占满整行，devDock + 项目数统计
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action', id: 'dev-dock', order: 10, locale: NS, store,
  }, DevDockEntry))
  // 抽屉：shell.overlay 右停靠面板
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay', id: 'dev-dock-drawer', order: 100, locale: NS, store,
    inject: devDockInjected,
  }, DevDockDrawer))
}
```

### 5.2 入口行（DevDockEntry）

- `wide` 时占满整行（footer.action 在 settings 上方）；rail 态显示图标
- 左侧"devDock"，右侧项目数统计（来自 settings 实时数据），点击打开抽屉

### 5.3 抽屉（DevDockDrawer）

- `shell.overlay` 帧级右停靠面板（参照 ui-subagent-sidebar Panel + ui-settings Modal 的 mask/Escape/focus 管理）
- 内容区四个页签：**项目列表 / 一键启动 / 导入 / 设置**（设置可并入列表页）
- 数据流：`ctx.settingsScope.bind({ namespace: 'dev-dock', decode })` → 快照 + watch；`ctx.remote.$on('settings/document-updated')` 由 bind 内部订阅，UI 实时刷新
- 动作流（打开 IDE/终端/一键启动/触发分析）：找到当前活跃 session → `session.prompt([{ type: 'text', text: '<动作指令>' }], 'queue')` → agent 调对应工具 → 权限管线 → 执行；UI 显示"已发送，agent 正在执行"反馈

### 5.4 页面

- **ProjectListPage**：项目卡片（名称/别名、类型徽章、包管理器、路径、脚本数）；点击进详情；每卡删除按钮（confirm）；"导入项目"按钮
- **ProjectDetailPage**：元数据（类型/包管理器/Node 版本/构建命令/路径）；scripts 列表（点击 → 提示将打开系统终端执行，经 agent 触发）；编辑器选择 + "打开"按钮
- **QuickStartPage**：方案列表（新建/切换/删除）；方案编辑：项目多选（搜索）、每项编辑器多选 + 命令单选；"启动"按钮（经 agent 触发 `dev-dock_quick-start`）
- **ImportPage**：目录选择（`ctx.remote` 或 directory-picker 服务？——初始用输入路径 + 触发 agent 分析）；显示 agent 分析返回的候选清单 → 勾选 → 确认保存（经 agent `dev-dock_save-project`）

### 5.5 样式与文案

- CSS Modules + `--dsw-*` tokens（无字面色值、无组件库、无 Tailwind）
- 产品文案中文（`locales.ts` zh/en 双份，默认 zh），代码注释英文

## 6. cordis.patch.yml 与注册面

```yaml
# devDock bundle layer
- insert:
    - id: dev-dock
      name: '@liyuera/dsh-dev-dock'          # host 半（工具 + settings）
    - id: dev-dock-ui
      name: '@liyuera/dsh-dev-dock'           # client 半（dsh.client manifest 同一包双面）
      dsh: { client: { platform: 'web' } }    # 具体 manifest 形态照 ui-subagent-sidebar
```

（照 ui-subagent-sidebar 的 cordis.patch.yml：单行 insert，name 即包名；`dsh.client` 声明在 package.json。）

安装：`dsh plugin --profile web add link:/Users/liyu/Documents/www/DeepSeek/deepseek-harness/deepseek-harness-plugin/dev-dock`，重启 `dsh web`。

## 7. 测试策略

- 复用 harness 测试栈：vitest（bin 解析自 harness 根 node_modules）+ `@deepseek-ai/dsh-client-test-runtime`
- host 半：
  - `scan.spec.ts`：fixture 目录树（package.json 项目 / manifest.json 项目 / 普通目录 / 跳过目录）断言信号
  - `schema.spec.ts`：settings schema 校验（合法/非法样本）
  - `editors.spec.ts`：平台注入 mock 检测命令，断言检测逻辑
  - `actions.spec.ts`：命令拼接纯函数（open-ide/open-terminal 的 argv）断言；权限分支（never 直行 / ask 请求 / 拒绝）
- client 半：
  - `browser-plugin.client.spec.ts`：真 SlotRegistry 树，apply 后断言 slot 条目 + fiber dispose 移除（HMR 安全）
  - `pages.client.spec.tsx`：组件喂 props/store 直测（jsdom pragma）
- 手动验证：`dsh web` 实机——安装、入口显示、抽屉、导入流程（AI 分析）、一键启动、审批弹窗、macOS 实机开终端/IDE

## 8. 实施阶段

| Phase | 内容 | 验证 |
|---|---|---|
| P0 骨架 | 包目录/package.json/tsconfig/tsdown/patch/invariant/css-modules.d.ts/README | `tsc -b && tsdown --env.DSH_BUILD_FACE=client` 出 lib/ |
| P1 host 数据 | schema.ts + settings 注册 + scan/save/list/remove/editors 工具 | 单测绿；`dsh web` 加载无错 |
| P2 host 动作 | open-ide/open-terminal/quick-start + 权限接入 + 平台层 | 单测绿；macOS 实机打开 |
| P3 client 骨架 | locales/stores/api/入口行/抽屉 | `test:gui` 等价（vitest client spec）绿；实机入口可见 |
| P4 client 页面 | 项目列表/详情/一键启动/导入 | 组件测试绿；实机全流程 |
| P5 收尾 | 测试补全、README Model Experience、双平台核对、提交 | 全绿 + 实机冒烟 |

## 9. 风险与待验证点

| 风险 | 缓解 |
|---|---|
| client 半构造 `SettingsNamespace` 品牌类型（`settingsNamespace()` 是 host 包函数） | type-only import `@deepseek-ai/dsh-settings/types` + cast；ui-settings 有先例（settings-scope.ts:26-28） |
| `settingsScope` 服务在独立插件 bundle 的 inject 可用性 | peerDependencies 声明 `@deepseek-ai/dsh-client-ui-settings`；加载顺序由 cordis fiber 等待服务 |
| `Session.prompt` 在无活跃会话时的行为 | UI 先查活跃 session（`useSessions`），无则提示"请先打开一个会话" |
| Windows 注册表检测差异（不同系统语言/位数） | 双路检测（注册表 + where）+ 手动配置兜底 |
| osascript 在 macOS 的权限（自动化授权弹窗） | 首用提示；失败降级 iTerm |
| approval answerer 在 Web GUI 的可用性（ask 时谁弹窗） | 与 ui-permission 交互；实机验证审批流 |
| 独立仓库测试不跑主仓库 gate | 参照 ui-subagent-sidebar 的测试组织，插件内自跑 vitest |

## 10. 明确不做（本期范围外）

- 不管理 Node 版本（不做 nvm/fnm/volta 切换）
- 不做 Git 状态 UI（Git 工具留给 agent 原生能力；注册表不含 Git 字段）
- 不做项目分组/搜索（列表简单展示）
- 不做内置终端/任务队列（全部走系统终端窗口）
- 不做 AI 提交信息/摘要（agent 原生具备）
