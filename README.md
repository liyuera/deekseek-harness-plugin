# deekseek-harness-plugin

李煜（liyuera）的 DeepSeek Harness (dsh) 插件集。每个插件一个目录，目录名即插件名。

本仓库设计为放在 deepseek-harness 工作区根目录下（`deekseek-harness-plugin/`），
构建时借用 harness 的客户端构建设施；插件代码与 fork 的版本库完全分离。

## 插件列表

| 目录 | npm 包名 | 说明 |
| --- | --- | --- |
| [`ui-subagent-sidebar/`](ui-subagent-sidebar/) | `@liuyera/dsh-client-ui-subagent-sidebar` | 右下角 subagent 运行计数胶囊 + 右侧根分组概览面板 |
| [`dev-dock/`](dev-dock/) | `@liyuera/dsh-dev-dock` | devDock v1.0.0：项目 = dsh 工作区；开始上班弹窗、会话头部 IDE/终端/启动（确定性桌面动作）、每工作区 IDE 偏好与编辑器检测（真实应用图标） |

## 安装

```sh
dsh plugin --profile web add link:/绝对路径/deepseek-harness/deekseek-harness-plugin/ui-subagent-sidebar
```

重启 `dsh web` 后生效。

## 开发

每个插件目录内：

```sh
tsc -b && tsdown --env.DSH_BUILD_FACE=client   # 重新构建（bin 解析自 harness 根 node_modules）
```

构建产物 `lib/`（含浏览器 bundle `lib/client.js`）提交进本仓库，安装即用，无需在目标机器构建。
