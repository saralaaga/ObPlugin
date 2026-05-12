# Task Hub

[English](README.md)

Task Hub 是一个仅支持 Obsidian 桌面端的任务聚合插件。它会把散落在 vault 各个 Markdown 笔记里的任务集中到任务、日历和标签视图里，让你既保留纯文本笔记的自由，又能有一个统一的任务工作台。

## 功能

- 扫描 vault 中的 Markdown 任务：`- [ ]` 和 `- [x]`。
- 点击任务可打开源笔记，并定位到原任务行附近。
- 支持安全完成 vault 任务：写回前会确认源行仍匹配，避免改错行。
- 提供任务视图、日历视图和标签视图。
- 支持按完成状态、来源、标签、日期分组、文本和自定义且/或条件筛选。
- 支持日期语法：`📅 YYYY-MM-DD` 和 `due:: YYYY-MM-DD`。
- 支持按日、周、月查看有日期的任务和外部日历事件。
- 支持只读公共 ICS 日历源。
- 在本地 helper 可用时，支持 macOS 桌面端读取本地 Apple Reminders 和 Apple Calendar。
- 开启创建权限后，可通过编辑器右键菜单、命令面板、用户自定义快捷键或 Task Hub 任务详情，把某条 vault Markdown 任务显式发送到 Apple 提醒事项。
- 支持在插件设置中切换英文和中文界面。

## 使用方式

启用 Task Hub 后，可以通过左侧 ribbon 图标或命令面板中的 **Open Task Hub** 打开任务工作台。

任务视图会把 vault 任务和支持的外部任务来源集中显示。左侧栏可按来源或标签筛选；顶部工具栏可切换是否显示已完成任务、打开条件筛选、按文本搜索，或重新扫描 vault。

开启本地 Apple 和 Apple 提醒事项后，单独打开 **从 vault 任务创建 Apple 提醒事项** 设置，即可一条一条地从 vault Markdown 任务创建提醒事项。入口包括任务行上的编辑器右键菜单、命令面板中的 **将当前任务发送到 Apple 提醒事项**、你在 Obsidian 中绑定到该命令的快捷键，以及 Task Hub 任务详情里的操作按钮。

日历视图会合并有日期的任务、公共 ICS 事件、Apple Calendar 事件，以及可用的有日期 Apple Reminders。你可以在月、周、日布局之间切换。

标签视图会按标签聚合索引到的任务，并支持查看某个标签下的具体任务。

## 当前边界

第一批版本优先保证稳定、轻依赖和可维护：

- vault 内 Markdown 任务可以在 Task Hub 中完成。
- vault 内 Markdown 任务只有在用户明确触发时才会发送到 Apple 提醒事项；Task Hub 会记录已创建的提醒事项 id，避免重复发送。
- Apple Reminders 完成状态回写是可选能力，需要在设置中单独开启。
- Apple Calendar 事件和公共 ICS 事件目前只读。
- 暂不支持 Obsidian Tasks 插件完整语法。
- 暂不支持 Markdown 任务的具体开始/结束时间、Google Calendar OAuth、Microsoft Calendar OAuth 和移动端。

## 隐私

Task Hub 会在本地扫描当前 vault 的 Markdown 文件，并把插件设置保存在 vault 的 Obsidian 插件数据中。公共 ICS 只会访问你手动配置的 URL。本地 Apple 集成仅在 macOS 桌面端运行，并会先通过 macOS 权限系统请求提醒事项或日历访问权限。

Task Hub 不会把 vault 任务发送到远程服务。

## 安装

当 Task Hub 上架 Obsidian 社区插件市场后，可从 **设置 -> 第三方插件 -> 浏览** 中安装。

从 GitHub Release 手动安装：

1. 从最新 release 下载 `manifest.json`、`main.js` 和 `styles.css`。
2. 在 vault 中创建目录：`.obsidian/plugins/task-hub/`。
3. 把下载的文件复制到该目录。
4. 重启 Obsidian 或重新加载第三方插件，然后启用 **Task Hub**。

本地 Apple Reminders 和 Apple Calendar 支持依赖 `taskhub-apple-helper` 二进制文件。Obsidian 社区插件安装器只会下载标准插件附件，因此 helper 目前作为可选的本地/开发能力处理，除非后续提供单独的分发路径。

## 开发

```bash
npm install
npm test
npm run typecheck
npm run build
```

常用命令：

```bash
npm run dev
npm run dev:hot
npm run smoke
npm run check:apple-helper
npm run diagnose:apple
```

在 macOS 上构建可选 Apple helper：

```bash
npm run build:apple-helper
```

## 发布附件

Obsidian 社区插件 release 的 GitHub tag 必须和 `manifest.json` 中的 `version` 完全一致，并上传这些二进制附件：

- `main.js`
- `manifest.json`
- `styles.css`

仓库根目录也保留 Obsidian 初次提交所需的基础文件：

- `README.md`
- `LICENSE`
- `manifest.json`
- `versions.json`
