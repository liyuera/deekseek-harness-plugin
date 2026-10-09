# 收藏作为真引用（宿主侧展开）设计

对应讨论中的 **D 方案**。前三个方案（纯文本 / `@短名 全文` / `@"全文"`）都在同一处受限：**消息文本只有一份，它既是模型看到的，也是气泡显示的那份**，所以"模型收到提示词全文"和"气泡显示胶囊"不可兼得。

D 打破这个限制的办法是 DSH 的原生引用架构：**消息里只留提及，内容由宿主展开成上下文**。这样气泡是胶囊、模型拿到全文，两者都对。

- 前置阅读：[DESIGN.md](DESIGN.md)（插件总设计）、[PLAN.md](PLAN.md)（实现计划与偏差记录）
- 同目录 `src/` 为当前实现，本文只描述**增量**

## 1. 目标

1. 输入框用 `@` 选中收藏 → 插入的 chip 在**发出后仍然是胶囊**（与 `@apps/` 同一套渲染），不再退化成纯文本。
2. 模型拿到的仍是**提示词全文**——但不是内联在用户消息里，而是紧随其后的一条上下文消息（和跨会话引用 `@会话` 完全同构）。
3. 引用解析不到时不静默：注入一条明确的"未解析"说明，模型和人都能看到。

## 2. 现有机制（已验证）

### 2.1 气泡里的胶囊是"文本形状装饰"

[ui-primitives 的 `projectUserText`](../../packages/client/ui-primitives/src/user-text.tsx#L81-L97) 用正则扫消息文本：

```
/(^|\s)(\/[\w-]+(?=\s|$)|@"[^"\n]+"|@[^\s]+)/gu
```

命中 `@词` 就渲染成带图标的胶囊。也就是说：**转录里的胶囊 = 对消息文本的装饰**，没有第二份展示数据。

### 2.2 引用的展开样板（`dsh-session-reference`）

[`packages/context/session-reference/src/index.ts`](../../packages/context/session-reference/src/index.ts#L136-L146)：

```ts
ctx.on('agent/pre-step', async ({ agent, signal }, next): Promise<PreStepDecision> => {
  const decision = await next()
  if (decision.kind === 'reject') return decision
  return { ...decision, messages: await this.prepareDirectMessages(agent, decision.messages, signal) }
}, { prepend: true })
```

它把消息里的规范提及改写成人读形式，**并在引用它的消息后面追加一条 user-role 上下文消息**（`createUserMessage({ source, content })`）。

### 2.3 两个承重事实

| 事实 | 出处 | 对我们的意义 |
|---|---|---|
| 注入的消息会被写进 session 日志 | [agent.ts](../../packages/core/agent-loop/src/agent.ts#L375-L379)：`if (firstAttempt) for (const message of decision.messages) this.session.append('user/message', message, { surfaceOp: 'append' })` | "模型可见 ⟺ 已记录"自动成立，不需要我们额外记账 |
| pre-step 只看到**本步新声明**的消息 | [agent.ts](../../packages/core/agent-loop/src/agent.ts#L245-L251)：`const claimed = this.inbox.claim(target, position.turn)`，再交给 waterfall | 天然幂等：后续 step 里同一条用户消息不会再出现，不会重复注入 |

## 3. 设计

### 3.1 提及语法

`@<名字>`，名字是**存在记录里、稳定且唯一**的标识。

- 必须是**无空白**的 slug：提及按空白切词，带空格的名字会在第一个空格处断掉。
- 不能含 `/`（避开文件/目录提及的形状，也让"目录提及"天然不匹配）。
- 形状上与文件提及同族，所以转录用同一套装饰规则渲染成胶囊（图标是文件/文件夹字形——`appearance` 是封闭联合，拿不到书签图标，见 §7）。

### 3.2 名字（slug）的铸造与唯一性

**由宿主铸造，客户端只读**（单写者，避免两端各铸一份产生分歧）。

```
slug(正文)：
  1. 取第一个非空行，去首尾空白
  2. 空白 → '-'；其余标点/符号删除
  3. 只保留字母、数字、CJK
  4. 截断到 16 个码点（按码点切，不切坏代理对）
  5. 结果为空 → 'prompt'
  6. 唯一化：与既有名字冲突时追加 '-2'、'-3'…
```

例：`根据git diff 的结果，给我生成commit msg` → `根据git-diff-的结果给我生成commit-msg`（截 16）→ `根据git-diff-的结果给我`；`git commit message` → `git-commit-message`。

**可改**：设置页显示名字（带 `@` 前缀）并可编辑；改名请求由宿主校验（slug 合法 + 唯一），不合法就拒绝并在页面上给出原因——**不静默改写用户输入**（misconfiguration fails loud）。

### 3.3 数据模型

`PromptRecord` 增加可选字段 `name?: string`：

```ts
export interface PromptRecord {
  id: string
  name?: string | undefined   // 新增：提及标识；老记录没有
  text: string
  createdAt: number
  source?: PromptSourceRef | undefined
}
```

- **保持 `version: 1`**：新增可选字段是向后兼容的。新读旧记录 → 缺 `name`，宿主回填；旧读新记录 → zod 对象默认丢弃未知键，不会报错。因此不需要 `compatibleVersions` 或格式版本变更。
- **回填**：宿主在 domain 打开后扫描一遍，给缺 `name` 的记录铸名并写回（幂等；`per-record` 布局下就是逐条 `put`）。这样老收藏不需要用户先手动命名就能被引用。
- `POST` 创建时宿主直接铸名一并写入；`PATCH` 从 `{ id, text }` 扩展为 `{ id, text?, name? }`（至少给一个），改名的唯一性与合法性在同一处校验。

**附带收益**：草稿持久化用的一直是 clipboard 投影，所以刷新页面后 chip 会退回成文本 `@名字`——在 D 之下这**不再有影响**，因为消息载荷本来就是这段提及文本，发送行为完全一致（旧方案下这一步会丢掉"胶囊"的语义）。

### 3.4 客户端插入

`onPick` 返回提及形态的 chip：

```ts
{
  insert: {
    source: FAVORITES_SOURCE_NAME,
    ref: record.name,                     // ref 即名字：codec 拿得到，无需查表
    label: record.name,                   // 胶囊显示
    clipboardText: `@${record.name}`,     // 草稿投影（持久化用的也是它）
  },
}
```

codec（必须实现，产出 `insert` 的源缺 codec 会在提交时硬报错）：

```ts
codec: {
  clipboardText: ref => `@${ref}`,
  serialize: ref => Promise.resolve(`@${ref}`),
}
```

于是草稿、发出的消息文本、模型看到的用户消息**三处一致**，都是 `@名字` ✓。气泡由 §2.1 的装饰规则渲染成胶囊 ✓。

**改名后的行为**：已插入的 chip 里存的是旧名字，提交后消息里就是旧名字 → 宿主解析不到 → 走 §3.6 的未解析提示。这是设计内的失败路径，不是 bug。

### 3.5 宿主展开

新增 `src/host/expand.ts`（纯函数，可单测）：

```ts
/** 扫一条消息文本里所有提及。 */
export function scanMentions(text: string): string[]
/** 从记录里按名字解析；未命中的原样返回。 */
export function resolveMentions(names, records): { resolved: PromptRecord[]; unresolved: string[] }
/** 渲染注入的上下文消息正文；`omitted` 是超出上限未展开的提及数。 */
export function renderReferenceContext(
  resolved: readonly PromptRecord[], unresolved: readonly string[], omitted: number,
): string
```

单条消息最多展开的引用数：`MAX_REFERENCES_PER_MESSAGE = 3`。

`src/index.ts` 增加监听（domain 生命周期与路由已经分开；插件激活等 `inject` 里的 `webServer` 与 `storageDomain`）：

```ts
ctx.on('agent/pre-step', async (_payload, next) => {
  const decision = await next()
  if (decision.kind === 'reject') return decision
  const domain = await ready                    // 域已打开
  const table = domain.table(PROMPT_TABLE)
  const messages: UserMessage[] = []
  for (const message of decision.messages) {
    messages.push(message)
    if (message.source.kind !== 'user') continue  // 只扫人发出来的
    const names = scanMentions(textOf(message)).slice(0, MAX_REFERENCES_PER_MESSAGE)
    if (names.length === 0) continue
    const { resolved, unresolved } = resolveMentions(names.slice(0, MAX_REFERENCES_PER_MESSAGE), records)
    messages.push(createUserMessage({
      source: { kind: 'plugin', plugin: 'favorite-prompts' },
      content: [{ type: 'text', text: renderReferenceContext(resolved, unresolved, Math.max(0, names.length - MAX_REFERENCES_PER_MESSAGE)) }],
    }))
  }
  return { ...decision, messages }
}, { prepend: true })
```

要点：

- **`prepend: true`**：与 `session-reference` 一致——先拿到下游过滤后的 `messages` 再追加，而不是抢在别人之前。
- **只扫 `source.kind === 'user'`**：插件注入的上下文不递归展开。
- **幂等免费**（§2.3）：只扫本步新声明的消息。
- **上限 3 条/消息**：整段粘贴时不炸开。
- 名字解析**只按 `name` 精确匹配**，不做模糊匹配——模糊匹配会让"引用了哪一条"变得不可预测。

### 3.6 注入的上下文内容

```markdown
## Referenced saved prompts

The user's message cites N saved prompt(s). Each prompt below is the user's own
saved text: treat it as part of their instruction.

### @<name>

<提示词全文，原样，不转义>

### @<unknown-name>

Unresolved: no saved prompt has this name. It may have been renamed or deleted;
ask the user which prompt they meant.
```

- 提示词是**用户自己的**文本，所以按用户指令对待，不加"untrusted background"警告（那是跨会话引用他人内容的场景）。
- 未解析的引用与已解析的写在同一段里，模型和用户都能看到哪条没展开。
- 上下文按 `{ kind: 'plugin', plugin: 'favorite-prompts' }` 归属，转录里显示成一行"注入上下文"。

### 3.7 三方视角对照

| | 用户消息文本 | 气泡 | 模型收到 |
|---|---|---|---|
| 现在（纯文本插入） | 提示词全文 | 纯文本 | 提示词全文 |
| **D（本文）** | `@名字` | 胶囊（文件字形） | `@名字` + 紧随其后的上下文消息（提示词全文） |

## 4. 失败与边界

| 场景 | 行为 |
|---|---|
| 引用被删除/改名 | 注入"未解析"说明（§3.6），不静默 |
| 名字与文件名撞了（收藏叫 `docs`，用户写 `@docs/`） | 提及按整词匹配，`@docs/` ≠ `@docs`，不误伤；真正的歧义（`@docs` 既是文件名也是收藏名）按收藏解析，文件引用那条链本来也不注入内容 |
| 一条消息里提及超过 3 个 | 只展开前 3 个，其余保持字面（并在上下文里说明被省略的数量） |
| 提示词极长 | 不设字节预算（YAGNI）；用户自己的提示词，超长是用户的选择 |
| 宿主没有 domain（headless 或未挂 storageDomain） | 不注册监听，消息里的 `@名字` 就是普通文本 |
| HMR / 插件重载 | domain 打开有 `already-open` 重试（已有）；监听随 fiber 拆除 |
| 老记录没有 `name` | 宿主在域打开时回填（§3.3） |

## 5. 验证计划

**单元**
- slug：ASCII / 中文 / 标点 / 空白 / 截断到码点 / 空串回落 / 重名追加序号。
- 提及扫描：行首、空白后、句末标点、`@` 出现在词中（不匹配）、`@"带空格"`（不匹配）、`@docs/`（含 `/` 不匹配我们的名字）。
- 解析：命中 / 未命中 / 超过上限时截断并统计 `omitted`。
- 名字唯一性：铸造时重名追加序号；**改名请求撞车时宿主拒绝**（返回 400 与原因），不改写用户输入。
- 上下文渲染：已解析与未解析混排、原文逐字保留（含换行与 Markdown 特殊字符）。

**宿主集成**
- 用假的 pre-step decision 驱动监听：用户消息后追加一条上下文；`kind: 'reject'` 原样返回；第二步没有新消息时不重复注入；非 user 来源的消息不展开。
- domain 打开时的回填：给一批缺 `name` 的记录，断言全部补上且不重复。

**客户端**
- `onPick` 的 `insert` 形状与 codec（`@name` 往返）。
- 设置页：名字展示、改名成功/被拒（重复名）两条路径。

**真实环境（`dsh web`）手测**
1. `@` 选一条收藏 → 输入框是胶囊 → 发送 → **气泡里仍是胶囊**（本次要修的症状）。
2. 气泡下方出现注入上下文行，内容是该收藏的提示词全文。
3. 模型的回复确实按那条提示词办（本次对话就是最好的验证：这条提示词是"根据 git diff 生成 commit msg"）。
4. 在设置页把该收藏改名 → 用旧名字的历史消息再发一次 → 出现"未解析"说明而不是静默。
5. 删掉一条被引用的收藏 → 同上。

## 6. 任务拆分（并入 PLAN.md 执行）

| 任务 | 内容 | 依赖 |
|---|---|---|
| **T9 名字** | slug 模块 + `PromptRecord.name` + 宿主铸造/回填 + `PATCH { name }` + 设置页显示与改名 | — |
| **T10 提及插入** | source 的 `insert`/codec 改为 `@名字`；`ref` 改为名字 | T9（名字存在） |
| **T11 宿主展开** | `host/expand.ts` + `agent/pre-step` 监听 + domain 与 webServer 解耦 + 幂等测试 | T9 |
| **T12 端到端** | 真实 `dsh web` 按 §5 手测清单逐条验证；文档同步 | T10、T11 |

## 7. 已知限制（落地后并入 DESIGN.md §12）

- 胶囊图标是**文件/文件夹字形**，不是书签：`ReferenceInsert.appearance` 与转录装饰的 `referenceKind` 都是封闭联合，插件无法扩展出"收藏"这一类。
- 提及是**纯文本约定**，没有规范化 wire form：改名/删除后旧消息里的引用会变成未解析（这是选择"提及即文本"的必然结果；`session-reference` 用 `@[label](dsh-session:id)` 这类 wire form 换取了稳定性，代价是气泡里那串东西更难看）。
- 不做模糊匹配、不做字节预算、不做引用清单 UI（哪些消息引用了哪条收藏）。
- 模型侧多了一条上下文消息，token 成本比内联文本略高（多一层标题与说明）。

## 8. 证据表

| # | 结论 | 出处（相对 harness 工作区） |
|---|---|---|
| R1 | 转录胶囊 = 对消息文本的形状装饰，`@词` 正则命中即渲染 | `packages/client/ui-primitives/src/user-text.tsx` |
| R2 | 引用展开样板：`agent/pre-step` + 追加 user-role 上下文消息 | `packages/context/session-reference/src/index.ts` |
| R3 | 注入的消息会被写入 session 日志（首个 attempt） | `packages/core/agent-loop/src/agent.ts` |
| R4 | pre-step 的 `messages` 是本步新声明的消息，天然幂等 | `packages/core/agent-loop/src/agent.ts` |
| R5 | 消息来源可用通用 `{ kind: 'plugin', plugin }` | `packages/llm/llm/src/message.ts` |
| R6 | chip 的 `appearance` 是 `'session' \| 'file' \| 'folder'` 封闭联合 | `packages/client/ui-conversation/src/client/contract/draft-editor.ts` |
