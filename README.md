# Task Hub

Task Hub is a desktop-only Obsidian plugin that gathers scattered Markdown tasks into focused task, calendar, and tag views. It is built for people who keep work in plain notes but still want one place to review commitments, dates, and context.

中文说明见下方“中文”部分。

## Features

- Collects Markdown tasks written as `- [ ]` and `- [x]` across the vault.
- Opens the source note from a task and positions the editor near the original line.
- Completes vault tasks safely by verifying the source line before changing `- [ ]` to `- [x]`.
- Provides task, calendar, and tag views.
- Supports filters for status, date bucket, tag, source path, text, and completed task visibility.
- Extracts due dates written as `📅 YYYY-MM-DD` or `due:: YYYY-MM-DD`.
- Shows dated tasks and events in day, week, and month calendar views.
- Supports read-only public ICS calendar sources.
- Supports local Apple Reminders and Apple Calendar on macOS desktop.
- Supports English and Chinese UI from the plugin settings.

## Current Scope

Task Hub intentionally keeps the first release conservative:

- Vault tasks can be completed from Task Hub.
- Apple Reminders completion writeback is optional and must be enabled in settings.
- Apple Calendar events and public ICS events are read-only.
- Full Obsidian Tasks plugin grammar, timed Markdown tasks, Google Calendar OAuth, Microsoft Calendar OAuth, and mobile support are not included yet.

## Privacy

Task Hub indexes Markdown files inside your local vault and stores plugin settings in the vault's Obsidian plugin data. Public ICS sources are fetched from the URLs you configure. Local Apple integration runs only on macOS desktop and asks macOS for Reminders or Calendar access before reading local data.

## Installation

Task Hub is not yet published in the Obsidian community plugin directory.

For local testing:

```bash
npm install
npm run build
mkdir -p /path/to/vault/.obsidian/plugins/task-hub
cp manifest.json main.js /path/to/vault/.obsidian/plugins/task-hub/
cp src/styles.css /path/to/vault/.obsidian/plugins/task-hub/styles.css
```

Then open Obsidian, enable community plugins, and enable `Task Hub`.

If you want to test local Apple Reminders and Calendar support from source, build and copy the helper too:

```bash
npm run build:apple-helper
cp taskhub-apple-helper /path/to/vault/.obsidian/plugins/task-hub/
```

Regular users do not need Xcode. Developers only need the macOS Swift toolchain when building `taskhub-apple-helper` from source.

## Development

```bash
npm install
npm test
npm run typecheck
npm run build
```

Useful commands:

```bash
npm run dev
npm run smoke
npm run check:apple-helper
npm run diagnose:apple
```

## Release Notes For Obsidian Community Plugins

The repository includes the root files expected by the Obsidian submission flow:

- `README.md`
- `LICENSE`
- `manifest.json`
- `versions.json`

For a GitHub release, upload these assets:

- `main.js`
- `manifest.json`
- `styles.css`

The release tag must match `manifest.json`'s `version` exactly, for example `0.1.0`.

Important Apple helper note: the official Obsidian community plugin release asset list only covers `main.js`, `manifest.json`, and optional `styles.css`. The current Apple helper binary is therefore treated as an optional local/developer capability unless a separate, reviewed distribution path is added.

## 中文

Task Hub 是一个仅支持 Obsidian 桌面端的任务聚合插件。它会把散落在 vault 各个 Markdown 笔记里的任务集中到任务、日历和标签视图里，让你既保留纯文本笔记的自由，又能有一个统一的任务工作台。

## 功能

- 扫描 vault 中的 Markdown 任务：`- [ ]` 和 `- [x]`。
- 点击任务可打开源笔记，并定位到原任务行附近。
- 支持安全完成 vault 任务：写回前会确认源行仍匹配，避免改错行。
- 提供任务视图、日历视图和标签视图。
- 支持按状态、日期分组、标签、来源路径、文本和“是否显示已完成任务”筛选。
- 支持日期语法：`📅 YYYY-MM-DD` 和 `due:: YYYY-MM-DD`。
- 支持按日、周、月查看有日期的任务和日历事件。
- 支持只读公共 ICS 日历源。
- 支持 macOS 桌面端本地 Apple Reminders 和 Apple Calendar。
- 支持在设置中切换英文和中文界面。

## 当前边界

第一版优先保证稳定、轻依赖和可维护：

- vault 内 Markdown 任务可以在 Task Hub 中完成。
- Apple Reminders 回写为可选能力，需要在设置中单独开启。
- Apple Calendar 事件和公共 ICS 事件目前只读。
- 暂不支持 Obsidian Tasks 插件完整语法、Markdown 任务的具体开始/结束时间、Google Calendar OAuth、Microsoft Calendar OAuth 和移动端。

## 隐私

Task Hub 会在本地扫描当前 vault 的 Markdown 文件，并把插件设置保存在 vault 的 Obsidian 插件数据中。公共 ICS 只会访问你手动配置的 URL。本地 Apple 集成仅在 macOS 桌面端运行，并会先通过 macOS 权限系统请求提醒事项或日历访问权限。

## 安装

Task Hub 目前还没有发布到 Obsidian 社区插件市场。

本地测试：

```bash
npm install
npm run build
mkdir -p /path/to/vault/.obsidian/plugins/task-hub
cp manifest.json main.js /path/to/vault/.obsidian/plugins/task-hub/
cp src/styles.css /path/to/vault/.obsidian/plugins/task-hub/styles.css
```

然后打开 Obsidian，启用第三方插件，并启用 `Task Hub`。

如果要从源码测试本地 Apple Reminders 和 Calendar 支持，还需要构建并复制 helper：

```bash
npm run build:apple-helper
cp taskhub-apple-helper /path/to/vault/.obsidian/plugins/task-hub/
```

普通用户不需要安装 Xcode。只有开发者从源码构建 `taskhub-apple-helper` 时才需要 macOS Swift 工具链。

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
npm run smoke
npm run check:apple-helper
npm run diagnose:apple
```

## Obsidian 插件市场发布说明

仓库根目录已经包含 Obsidian 初次提交所需的基础文件：

- `README.md`
- `LICENSE`
- `manifest.json`
- `versions.json`

创建 GitHub Release 时，上传这些附件：

- `main.js`
- `manifest.json`
- `styles.css`

Release tag 必须和 `manifest.json` 中的 `version` 完全一致，例如 `0.1.0`。

Apple helper 说明：Obsidian 社区插件官方发布附件列表只覆盖 `main.js`、`manifest.json` 和可选 `styles.css`。因此当前的 Apple helper 二进制先作为可选的本地/开发能力记录，除非后续补充并验证单独的分发路径，否则不要声称社区插件市场会自动安装 helper。
