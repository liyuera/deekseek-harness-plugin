# ui-favorite-prompts 设计

把常用提示词收藏起来：在消息下方一键收藏、在输入框用 `@` 拉出收藏并插入、在设置里增删改。

- 包名：`@liyuera/dsh-favorite-prompts`
- 目录：`deepseek-harness-plugin/ui-favorite-prompts/`
- 目标宿主：dsh `web` profile（`dsh web`）
- 文档中的 `../../packages/...` 均指 harness 工作区 `deepseek-harness/`

## 1. 目标与非目标

**目标**

1. 每条自己发出的消息下方有一个收藏按钮，点一下把该消息文本存进收藏列表。
2. 输入框里打 `@` 时，除现有的「文件与文件夹 / 会话」外，多出一组「收藏」，选中后把提示词整段插入输入框。
3. 设置面板新增「收藏提示词」一节，提供增、删、改、手动新增。

**非目标（本期不做）**

- 收藏 assistant 的回答（`conversation.chat.assistant-actions` 槽现成，但未提出需求）。
- 在轨迹视图出现收藏按钮（那是另一个 conversation target，需要另写一份 Definition）。
- 拖拽排序、标签、分组、导入导出、快捷键。
- 云同步 / 多人共享。

## 2. 硬约束

**纯插件实现，不修改 dsh 本体任何代码。** 这条约束直接决定了下面每一处的实现方式，且排除了"给 ui-chat 加一个 user-actions 槽"这条最自然的路径（该槽不存在，见 §7 证据表 E1）。

## 3. 包形态与安装

```
ui-favorite-prompts/
├── package.json          # dsh.client + dsh.bundle.patch + exports(./client)
├── cordis.patch.yml      # 单行 insert 自己的行
├── tsconfig.json / tsdown.config.ts
├── src/
│   ├── index.ts          # Host 半边：domain + HTTP 路由
│   ├── schema.ts         # domain spec / 记录 zod schema / 请求响应类型（双半边共用）
│   └── client/
│       ├── index.ts      # apply：建 store、装配三个域
│       ├── locales.ts    # zh / en 词典
│       ├── store.ts      # 收藏列表快照 store + 增删改 action
│       ├── transport.ts  # fetch 封装
│       ├── strip/        # 需求 1：收藏条（Definition + renderer + CSS Module）
│       ├── trigger/      # 需求 2：@ 触发源
│       └── settings/     # 需求 3：设置页
└── tests/
```

- 构建复用本仓库既有的 `../build/client-bundle.ts`（`tsc -b && tsdown`），产物 `lib/` 提交进仓库。
- 安装沿用既有流程：`dsh plugin --profile web add link:/绝对路径/deepseek-harness/deepseek-harness-plugin/ui-favorite-prompts`，重启 `dsh web`。
- 运行时依赖只有 `zod`（storage-domain 的记录 schema 用 zod，见 E7）。`zod` 放 `devDependencies` 由 tsdown 内联，或装进本插件自己的 `node_modules`——storage-domain 只调用 `valueSchema.parse()`，不依赖实例同一性，两种都成立。
- 三个域的注册一律走 `ctx.slots.inject(...)` / `ctx.uiConversation.events.register(...)`，即"往别人的扩展点投稿"，不触碰任何插件内部。

## 4. 数据模型与持久化（方案 S4）

### 4.1 落点

dsh 存储域的 per-record 布局：每条收藏一个文件

```
$DSH_HOME/storages/favorite_prompts/prompts/<id>.json
{ "version": 1, "record": { "id": "…", "text": "…", "createdAt": 1730000000000 } }
```

纯 JSON、pretty-print、原子替换发布，可读可手改可 git（E6）。

- domain 名 `favorite_prompts`、表名 `prompts` —— **必须匹配 `^[a-z][a-z0-9_]*$`，不能有连字符**（E5）。domain 名全安装唯一，重名在 `open` 时 `already-open` 报错。
- 注意区分两套名字：domain 名是下划线（`favorite_prompts`，受 `UNIT_NAME_RE` 约束），而 HTTP 路径 `/favorite-prompts` 与设置页的 section id `favorite-prompts` 是连字符。两者互不相干，不要互相"对齐"。
- `layout: 'per-record'`：按条读写、按条版本戳，单条损坏只影响该条（配合 `invalidRecords: 'backup-and-skip'` 可把坏记录挪走而不是整个 domain 打不开）。

### 4.2 记录 schema

```ts
// src/schema.ts —— 双半边共用
export const PromptRecord = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  createdAt: z.number().int().nonnegative(),
  source: z.object({ sessionId: z.string(), seq: z.number().int().nonnegative() }).optional(),
})
```

`source` 只用于溯源（"这条是从哪条消息收藏的"），不参与任何逻辑；手改文件时删掉也合法。

**不设 title 字段**：`@` 菜单的行标题由正文首行派生（§6），设置页也不需要额外的标题编辑器。

### 4.3 Host 半边

1. `defineDomain({ name: 'favorite_prompts', version: 1, layout: 'per-record', invalidRecords: 'backup-and-skip', tables: { prompts: domainTable<PromptId, PromptRecord>(PromptRecord) } })`。
2. `ctx.storageDomain.open(spec)` 是异步的：模块内建一个一次性的 `ready` promise，路由 handler `await` 它；`ctx.effect` 的清理函数负责 `domain.close()`，并处理"open 完成时插件已被 dispose"的竞态——晚到的 domain 立刻 close（dispose 必须到达静止，而不是只发出请求）。
3. `ctx.webServer.register({ kind: 'exact', path: '/favorite-prompts', handler })`（E4 的 `WebRoute` 契约）。handler 自己拥有完整响应生命周期，异常在 handler 内兜住返回错误体，绝不逃逸成未处理拒绝。
4. `apply` 开头守卫：`ctx.get('webServer')` 或 `ctx.get('storageDomain')` 缺失时整体 no-op（headless profile 下没有浏览器半边，也就没有要服务的东西）——沿用 dev-dock 的写法（E8）。

### 4.4 HTTP 接口

同源、JSON 收发。单写者是人，不用做并发合并。

| 方法 | 路径 | 语义 |
|---|---|---|
| `GET` | `/favorite-prompts` | 返回 `{ ok: true, items: PromptRecord[] }`，按 `createdAt` 降序 |
| `POST` | `/favorite-prompts` | body `{ text, source? }` → 新建，返回新记录 |
| `PATCH` | `/favorite-prompts` | body `{ id, text }` → 改正文，返回更新后的记录 |
| `DELETE` | `/favorite-prompts?id=…` | 删除，返回 `{ ok: true }` |

- `id` 由 Host 生成，浏览器不铸造。
- 失败统一 `{ ok: false, error: '<一句话>' }` + 合适的 4xx/5xx；未知 `id` 返回 404 而不是静默成功。
- 方法不匹配返回 405；body 不是合法 JSON 返回 400。

### 4.5 为什么不用 settings 命名空间

对比过的另一条路是把列表塞进 `ctx.settings` 命名空间（dev-dock 存 `workspacePrefs` 就是这套）。放弃的原因：settings 是**配置文档**——每次增删改整体重写数组、靠 revision 乐观锁、和所有其他配置挤在 `settings.yaml`；而且客户端 settings 通道只在 loopback 页面生效，非 loopback 直接退化成内存模式。收藏是用户内容不是配置，S4 的按条原子写更贴，且不占用配置面。

## 5. 需求 1：消息下方的收藏条

### 5.1 机制

在 dsh 里，"消息下方的动作"必须挂在消息行自己身上；而用户消息行的动作区是 ui-chat 写死的（E1）。纯插件条件下唯一正解是**自己成为一个对话节点**，并按排序规则落在用户消息之后：

1. 注册 `ConversationNodeDefinition`：`kind: 'favorite-strip'`、`target: 'chat'`，`match` 命中 `user/message` 且正文非空；`anchorSeq` 取 `event.seq`，`id` 取 `String(event.data.id)`。
2. 注册 keyed renderer：`ctx.slots.inject('conversation.chat.node', () => ctx.slots.register({ name: 'conversation.chat.node', key: 'favorite-strip', locale: NS, inject }, FavoriteStrip))`。与 `ui-workflow-run` 完全同款（E3）。
3. 节点 view 对象自己构造（`chatNode()` 是 ui-chat 内部函数，不导出）：`{ key: context.key, kind, id: context.id, target: 'chat', anchorSeq, location, visibility: 'visible', data }`。
4. 节点 `data` 只放渲染需要的东西：`{ text, seq }`。正文直接从 `event.data.content` 取文本块拼接，**不读任何全局快照、不扫描节点列表**。

### 5.2 为什么一定排在用户气泡之后

Chat 节点排序比较器为 anchor → rank → originalAnchor → **key 字典序**（E2）。节点 key 是 `${kind.length}:${kind}${id}`。

- 内置用户节点：`kind = 'input-message'`（13 字符），`anchorSeq = event.seq` → key 前缀 `13:input-message`
- 本插件：`kind = 'favorite-strip'`（14 字符），`anchorSeq = event.seq` → key 前缀 `14:favorite-strip`

两者 anchor/rank 完全相同，比较落到字典序：`"13:…" < "14:…"` 恒成立，**与消息 id 无关**，所以收藏条永远紧跟对应的用户消息。

**这条依赖是隐式的**，必须在 `strip/definition.ts` 顶部写明：kind 名一旦改成让 `length:kind` 前缀小于等于 `13:input-message` 的名字，收藏条就会跑到气泡上面去。

另有一处必须同时满足：`anchorSeq` 与内置用户节点**完全相等**。新 kind 不在 `TURN_PROCESS_INDEPENDENT_KINDS` 里，若 anchor 小于该轮的 `openingHumanAnchor` 就会被折进"思考过程"折叠组（E2）。

### 5.3 渲染与交互

- 右对齐一行，只有一个小小的书签按钮；未收藏＝空心，已收藏＝实心。
- 用自己的 CSS Module + `--dsw-*` 语义 token，配一个负 margin 把这一行往气泡方向收，视觉上贴近；hover / focus-within 时才完全显形（和复制图标的显隐语言一致，但由本插件自己的 CSS 控制）。
- 点击：已收藏 → 取消收藏；未收藏 → 收藏。两种都弹 toast 反馈，失败时弹错误 toast 且列表不变。
- 收藏时写入的 `source` 由两处拼成：`sessionId` 来自该槽的 standard props（`conversation.chat.node` 是 session 作用域），`seq` 来自节点 data —— 两者在组件里合成后交给 action，不由 inject 阶段闭包捕获。
- "是否已收藏"的判定：把消息文本 trim 后与列表中记录的 `text` 做全等比较（不比较 `source`，同一段提示词可以从任何地方收藏/取消）。
- 正文为空（纯附件）的消息不生成节点，因此不会出现空行。

## 6. 需求 2：`@` 拉出收藏

### 6.1 机制

`ctx.inputTriggers.registerSource(source)`（E9）：

```ts
{ trigger: '@', name: 'favorites', order: 100, showGroupTitle: false,
  candidates, onPick }
```

- **`showGroupTitle: false` 是必须的**：分组标题走 ui-input-trigger 自己的 `slash.menu` 词典，插件无法本地化它（E10）。改为在每条候选上带 `section: t('group')`，由本插件的词典提供「收藏」/「Favorites」标题——这正是 ui-reference 的做法。
- `name: 'favorites'` 必须与现有 `@` 源不重名（现有 `reference`），`(trigger, name)` 重复会在注册时抛错（E9）。
- `order: 100` 让「收藏」组排在「文件与文件夹」之后。

### 6.2 候选行的构造

菜单行的显示契约是：标题取 `label`（缺省用 `name`），当 `label` 不是 `name` 的另一种大小写时把 `name` 作为尾随别名显示，`description` 右对齐，查询匹配 `name` 或 `label`（E11）。整段提示词塞进 `name` 会让行里出现一大坨别名，所以：

- `name` = 派生短名：正文首行 trim 后截断到 40 字符；同一菜单内重名时追加 ` (2)`、` (3)`。
- `label` = 与 `name` 相同（避免尾随别名）。
- `description` = 正文压成单行后截断的预览。
- `value` = 记录 `id`（opaque pick payload）。
- 过滤与排序**全部由本插件在 `candidates()` 里做**：对整段正文做大小写不敏感的子串匹配（中文直接命中），按 `createdAt` 降序，空查询返回全部（上限 50 条，避免一次渲染过多行）。

### 6.3 选中后的插入

`onPick` 返回 `{ text: record.text }`。走的是 `slash/input-insert-text` → `insertText(text, span)`：**替换掉 `@查询串` 那一段，插入的是可继续编辑的纯文本，不是 chip 令牌，也不需要实现 `codec`**（E12）。

两个已知细节：

- 若收藏正文以 `@xxx` 形式结尾，插入后可能重新触发菜单；实际提示词几乎不会，若不放心可在插入文本末尾补一个空格。
- 不实现 `lexicon` / `subscribeLexicon`：这两个是给"短名字引用装饰"用的（实现后草稿里的 `@名字` 会被画成 chip 样式）。本插件的候选是整段提示词，没有这种语义。代价是菜单打开期间新增收藏不会实时刷新——可接受。

## 7. 需求 3：设置页

注册进 `settings.section`（list 槽，E13）：

```ts
ctx.slots.inject('settings.section', () => ctx.slots.register({
  name: 'settings.section', id: 'favorite-prompts', order: 30,
  label: () => t('nav'), locale: NS, inject, store,
}, FavoritesSettingsPage))
```

- `order: 30` → 排在「已归档会话」(25) 之后；`id` 必须新起，复用别人的 id 会顶掉那一节。
- 沿用 `ui-settings-unarchive-sessions` 的最小形态（E14，49 行的现成范例）。
- 页面内容：列表行（正文预览两行 + 创建时间 + 编辑/删除）、空状态、顶部「手动新增」。
  - 编辑：整行换成多行文本域 + 保存 / 取消。
  - 删除：行内二次确认（点「删除」→ 变成「确认删除 / 取消」），不引入 Modal。
  - ui-primitives 没有列表、多行文本域、空状态、确认弹窗，这些自己写（和 dev-dock 的设置页一样）。
- **已知不可定制**：设置导航的图标由 shell 按 id 写死（`navIcon(id)`），新 section 一律拿到通用齿轮。纯插件方案无法改变，接受。

## 8. 跨组件共享状态

一个 `createSnapshotStore<FavoritesState>` 在客户端 `apply` 里创建一次，三个域共用：

```ts
interface FavoritesState {
  status: 'loading' | 'ready' | 'error'
  items: readonly PromptRecord[]
  error?: string
}
```

- 读：每个 registration 通过自己的 `inject` 返回 `hooks: { favorites }`，组件拿到 `useFavorites(sel)`——符合"渲染读到的东西一律走框架 hook，组件不做订阅"的规矩。
- 写：只有一组 action（`add` / `update` / `remove` / `refresh`），内部调 transport，变更成功后重取列表。
- 首帧 `status: 'loading'`；失败进 `error` 并在设置页与 `@` 菜单里表现为"空/不可用"，不抛给用户看堆栈。
- 多标签页一致：`window` 的 `focus` 事件触发一次 `refresh()`（不做 SSE / 轮询，普通场景够用）。

## 9. 文案与本地化

所有产品可见文案走本插件自己的 typed locale 词典（`LocaleNamespaceMap` 合并 + `ctx.locale.register(NS, { zh, en })` + `locale: NS` 注册项拿 `t` 座位），与仓库规范一致。`@` 菜单的分组标题用候选行的 `section` 字段承载。

## 10. 失败与边界

| 场景 | 行为 |
|---|---|
| Host 路由不可用（headless / 无 webServer） | 浏览器半边状态为 `error`，设置页显示"收藏服务不可用"，收藏条点击即失败 toast，不静默 |
| 网络失败 / 非 2xx | 保留原列表，弹错误 toast；设置页的编辑态不关闭，草稿不丢 |
| 未知 id（被别处删掉了） | 404 → 前端刷新列表并提示"该收藏已不存在" |
| 手改 JSON 导致单条非法 | domain 层 `backup-and-skip` 把该条挪走并记日志，其余条目正常加载 |
| 重复收藏同一段文本 | 允许（列表按 id 区分）；收藏条只按文本判"已收藏"，所以对同文本会显示为已收藏 |
| 超长正文 | 记录不设长度上限；候选行的 `name` / `description` 截断显示，插入时用全文 |

## 11. 验证计划

**单元测试**

- 正文 → 候选短名的派生（首行截断、重名追加序号）。
- `candidates()` 的过滤与排序（中文子串、大小写、空查询上限）。
- "是否已收藏"的选择器（trim 全等）。

**组件测试**（jsdom + 直接喂 props）

- 收藏条：未收藏/已收藏两态、点击触发正确 action、失败时不清空状态。
- 设置页：列表渲染、空状态、新增、编辑保存/取消、删除二次确认。
- `@` 菜单候选与 `onPick` 返回 `{ text }` 的形状。

**Host 测试**

- 路由方法分发、非法 JSON、未知 id、domain 不可用时的降级。
- domain spec 形状（名字匹配 `UNIT_NAME_RE`、版本为整数）。

**真实环境手测清单**

1. `dsh plugin --profile web add link:<绝对路径>` + 重启 `dsh web`。
2. 发一条消息 → 消息下方出现收藏条 → 点击 → toast 成功，`$DSH_HOME/storages/favorite_prompts/prompts/` 下出现新文件。
3. 输入框打 `@` → 出现「收藏」组 → 选中 → 提示词整段插入且可继续编辑 → 发送成功。
4. 设置 → 收藏提示词：改一条、删一条、手动加一条，重启 dsh 后仍在。
5. 再点一次已收藏消息的收藏条 → 取消收藏，文件消失。
6. 手动把某条 JSON 改坏 → 重启 → 该条被挪走，其余正常（日志有记录）。

## 12. 已知限制

- 轨迹视图没有收藏条（只实现了 `chat` target）。
- 设置导航项用通用齿轮图标。
- 多标签页靠窗口 focus 重取，不是实时推送。
- 只收藏文本，不收藏附件与图片。
- 不参与 dsh 的 session 日志，因此模型看不到"哪些提示词被收藏了"；若将来想让 agent 也能用，需要另加工具或 prompt 段落。

## 13. 后续可选（明确不在本期）

导出/导入 JSON；给收藏起别名（加 `title` 字段）；收藏 assistant 回答（复用现成的 `conversation.chat.assistant-actions` 槽即可）；轨迹视图版本；设置页拖拽排序。

## 14. 关键机制证据表

写实现时按此表回查，避免凭记忆改坏。

| # | 结论 | 出处（相对 harness 工作区） |
|---|---|---|
| E1 | 用户消息动作区写死，无 user-actions 槽；`extraActions` 仅由 assistant 的 turn tail 喂入 | `packages/client/ui-chat/src/client/chat/MessageItem.tsx`、`.../chat/TurnTailNodeView.tsx`、`.../chat/MessageIconActions.tsx`、`.../contract/slots.ts` |
| E2 | 节点排序 anchor→rank→originalAnchor→key 字典序；key = `${kind.length}:${kind}${id}`；用户节点 anchorSeq = `event.seq`，kind = `input-message` | `packages/client/ui-chat/src/client/conversation-nodes/chat-snapshot-builder.ts`、`packages/client/ui-conversation/src/client/contract/conversation.ts`、`packages/client/ui-chat/src/client/conversation-nodes/message.ts` |
| E3 | 插件注册对话 Definition 与 keyed Chat renderer 的公开路径 | `packages/client/ui-workflow-run/src/client/index.ts` |
| E4 | `webServer.register(WebRoute)`，handler 自持响应生命周期 | `packages/host/webserver/src/index.ts` |
| E5 | domain / table 名必须匹配 `^[a-z][a-z0-9_]*$` | `packages/storage/storage/src/backend.ts` |
| E6 | per-record 布局：一条记录一个文件、内容 `{version, record}`、原子发布 | `packages/storage/storage-json/src/format.ts`、`packages/storage/storage-json/README.md` |
| E7 | `ctx.storageDomain.open(spec)`；`KvTable` 的 get/entries/put/delete/update；记录 schema 用 zod | `packages/storage/storage-domain/src/index.ts`、`.../domain.ts`、`.../spec.ts` |
| E8 | Host 半边用 `ctx.get('webServer')` 守卫、`ctx.effect` 注册路由的写法 | `deepseek-harness-plugin/dev-dock/src/index.ts` |
| E9 | `ctx.inputTriggers.registerSource(source)`，`(trigger,name)` 唯一，重复抛错 | `packages/client/ui-input-trigger/src/client/contract.ts`、`.../client/service.ts` |
| E10 | 分组标题归属 ui-input-trigger 的 `slash.menu` 词典，插件改不了；解法是 `showGroupTitle:false` + 候选行 `section` | `packages/client/ui-input-trigger/src/client/*`、`packages/client/ui-reference/src/client/index.ts` |
| E11 | 候选行的 name/label/description/value 语义 | `packages/client/ui-input-trigger/src/types.ts` |
| E12 | `onPick` 返回 `{ text }` → 纯文本插入，替换 `@查询串`，无需 codec | `packages/client/ui-conversation/src/client/contract/input.ts`、`.../client/input/facade.ts`、`.../client/input/hub.ts` |
| E13 | `settings.section` 是 list 槽，注册项携带 id/order/label | `packages/client/ui-settings/src/client/contract/slots.ts` |
| E14 | 新增设置页的最小范例（49 行） | `packages/client/ui-settings-unarchive-sessions/src/client/index.ts` |
