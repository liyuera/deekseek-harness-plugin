# DeepSeek 余额查询插件（静态版）

在输入框工具行（“Full access”下拉右侧，`conversation.input.left` 插槽）展示
DeepSeek 账户余额的静态插件：

- 每 5 分钟主动轮询一次余额；
- 点击红色金额主动查询一次，不与轮询互相占用；
- 查询期间显示加载动画，请求完成后移除；
- 失败时保留上次余额并在悬浮提示中显示错误。

数据来自官方[查询余额接口](https://api-docs.deepseek.com/api/get-user-balance/)
（`GET https://api.deepseek.com/user/balance`），API Key 每次查询都通过
`ctx.credentials.resolve('DEEPSEEK_API_KEY')` 现取现用（进程环境 / 托管存储 /
`.env` 逐层解析），不缓存、不落盘。

## 组成

| 文件 | 作用 |
| --- | --- |
| `src/index.ts` | Node 半边（宿主进程）：注册 `webServer` 精确路由 `GET /ds-balance` |
| `src/client/index.ts` | 浏览器半边：向 `conversation.input.left` 插槽注册余额单元格 |
| `src/client/BalanceFooter.tsx` | 单元格组件：轮询、点击刷新、loading、金额展示 |
| `src/client/BalanceFooter.module.css` | 样式（红色金额 pill / spinner） |
| `src/invariant.ts` | 包级 invariant 伙伴插件 |

与动态插件（`cordis_define` 会话级）不同，这是一个真正的静态双面长驻插件：
Node 半边是宿主组合中的一行，浏览器半边通过 `dsh.client` 清单进入
`window.__DSH_BOOT__` 模块表。

## 安装

```sh
dsh plugin --profile web add link:/绝对路径/deepseek-harness/deekseek-harness-plugin/user-ds-balance
```

重启 `dsh web` 后生效（client-modules 的插件集变更需要重启才扫描到）。

## 构建

本目录内：

```sh
tsc -b && tsdown --env.DSH_BUILD_FACE=client   # 重新构建（bin 解析自 harness 根 node_modules）
```

构建产物 `lib/` 提交进本仓库，安装即用。此包位于插件仓库
`deekseek-harness-plugin/user-ds-balance/`（不在 harness 的 `packages/`
glob 内），构建时从插件目录借用工作区根 `node_modules` 的 tsdown/tsc bin
与客户端构建设施。

## 移除

- 从 web 配置中移除 `- id: user-ds-balance` 行；
- 删除本目录；重启服务。
