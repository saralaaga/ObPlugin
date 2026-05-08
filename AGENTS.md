# AGENTS.md

本文件是 `/Users/carlos/Coding/ObPlugin` 的协作约定。后续 agent 进入本仓库时，先读这里，再读 `README.md` 和相关源码。

## 项目定位

这是一个 Obsidian 插件项目，插件名是 **Task Hub**。目标是把散落在 vault 各个 Markdown 笔记里的任务集中展示，并提供：

- 任务总览、筛选、标签汇总。
- 点击任务跳转回源笔记对应行。
- 安全地把源笔记里的 `- [ ]` 改成 `- [x]`。
- 按日、周、月查看有日期的任务和外部日历事件。
- 支持中英文界面。
- 支持只读公共 ICS 日历源。
- 支持 macOS 桌面端只读读取本地 Apple Reminders 和 Apple Calendar。

第一版重点是“可用、稳定、轻依赖”。不要为了视觉或架构洁癖引入大型 UI 框架或日历库，除非明确讨论并确认。

## 技术栈

- TypeScript
- Obsidian Plugin API
- esbuild
- Jest
- 原生 DOM 渲染
- 插件样式在 `src/styles.css`

不要提交生成物：

- `main.js` 是构建产物，已在 `.gitignore`。
- `node_modules/` 不提交。

注意：Obsidian 插件实际安装目录需要 `styles.css`，但仓库源码跟踪的是 `src/styles.css`。同步到测试 vault 时，需要把 `src/styles.css` 复制成目标目录里的 `styles.css`。

## 常用命令

安装依赖：

```bash
npm install
```

完整验证：

```bash
npm test
npm run typecheck
npm run build
```

开发 watch build：

```bash
npm run dev
```

当前测试 vault 路径：

```text
/Users/carlos/Coding/testValut
```

同步到测试 vault：

```bash
npm run build
mkdir -p /Users/carlos/Coding/testValut/.obsidian/plugins/obsidian-task-hub
cp manifest.json main.js /Users/carlos/Coding/testValut/.obsidian/plugins/obsidian-task-hub/
cp src/styles.css /Users/carlos/Coding/testValut/.obsidian/plugins/obsidian-task-hub/styles.css
```

写入测试 vault 在当前沙箱里通常需要权限提升。

## 代码结构

核心文件：

- `src/main.ts`：插件生命周期、命令、ribbon、view 注册、设置、扫描和同步入口。
- `src/settings.ts`：插件设置页和 ICS 源配置。
- `src/types.ts`：任务、日历、设置等领域类型。
- `src/i18n.ts`：中英文翻译键。
- `src/parsing/taskParser.ts`：Markdown 任务解析。
- `src/indexing/taskIndex.ts`：vault 任务索引和文件缓存状态。
- `src/indexing/taskActions.ts`：安全完成任务的文本更新逻辑。
- `src/filtering/filters.ts`：任务筛选和日期分组。
- `src/filtering/tagStats.ts`：标签统计。
- `src/calendar/icsClient.ts`：ICS 拉取、解析、错误分类。
- `src/calendar/calendarModel.ts`：任务和事件合并成日历项。
- `src/views/TaskHubView.ts`：主视图状态和 view 切换。
- `src/views/renderShell.ts`：顶部工具条、筛选和主容器。
- `src/views/renderTasksView.ts`：任务列表。
- `src/views/renderTagsView.ts`：标签统计视图。
- `src/views/renderCalendarView.ts`：日历月视图、日/周时间轴视图。
- `src/styles.css`：所有插件样式。

文档：

- `README.md`：用户和开发基本说明。
- `docs/manual-test-vault.md`：Obsidian 手工测试清单。
- `docs/superpowers/specs/2026-05-05-obsidian-task-hub-design.md`：需求和设计背景。
- `docs/superpowers/plans/2026-05-05-obsidian-task-hub-implementation.md`：第一版实现计划记录。

## 当前能力边界

已实现：

- Markdown 任务语法：`- [ ]`、`- [x]`。
- 日期语法：`📅 YYYY-MM-DD`、`due:: YYYY-MM-DD`。
- 标签解析：Obsidian 风格 `#tag`。
- 任务筛选：状态、日期桶、标签、来源路径、文本搜索。
- 任务跳转：打开源笔记并定位到任务行附近。
- 安全完成：只有确认源行仍匹配时才写回。
- 标签统计和标签 drilldown。
- 日历：月视图、周视图、日视图。
- 周/日视图支持有具体时间的 ICS 事件纵向时间轴。
- vault 任务目前是全天日期项。
- 多个只读公共 ICS 源、颜色、启用/禁用、同步状态和缓存事件。
- 本地 Apple Reminders / Apple Calendar 只读同步，设置页可开关。
- 本地 Apple Reminders / Apple Calendar 正式同步路径应通过随插件发布的 `taskhub-apple-helper` 调用 EventKit；不要把 AppleScript/JXA 作为默认后端。
- 普通用户不需要 Xcode；开发者构建 helper 时需要 macOS Swift 工具链。
- 发布包除了 `manifest.json`、`main.js`、`styles.css`，还需要包含可执行的 `taskhub-apple-helper`。
- English / 中文 UI。

尚未实现，不要声称已经支持：

- Obsidian Tasks 插件完整语法兼容。
- timed task 语法，也就是笔记任务自身的具体开始/结束时间。
- Google Calendar / Microsoft Calendar OAuth。
- 编辑或创建外部日历事件。
- 写入或完成外部任务。
- 移动端适配验证。

## 实现约定

- 保持依赖轻量。新增依赖前先确认必要性。
- 纯逻辑优先写在可测试模块里，避免塞进 Obsidian runtime 类。
- UI 渲染继续使用小型 DOM renderer，不要临时引入 React/Vue/Svelte。
- 任务写回必须保守：不能确认源行时，宁可报冲突，也不要改错行。
- vault 扫描要避免阻塞 Obsidian：优先使用 `mtime + size` 缓存判断，只扫描 Markdown 文件。
- 日历外部源默认只读。失败时保留最后一次成功缓存，并展示错误状态。
- 新增用户可见文案时同步更新 `src/i18n.ts` 的英文和中文。
- 样式必须 scoped 到 `.task-hub-*`，不要污染 Obsidian 全局。
- 日/周/月布局要兼顾窄 pane，不要让文字溢出按钮或卡片。

## 测试约定

改动后按风险选择验证：

- 解析、筛选、日历模型、ICS：必须加或更新 Jest 测试。
- UI 文案和布局：至少跑 `npm run typecheck`、`npm run build`，必要时同步到测试 vault 手工看。
- 任务写回逻辑：必须跑相关测试，重点看冲突保护。
- 设置项 schema 变化：确认 `DEFAULT_SETTINGS`、`TaskHubSettings`、设置页和旧数据兼容。

标准验证命令：

```bash
npm test
npm run typecheck
npm run build
```

如果同步到测试 vault，建议用 `cmp -s` 确认：

```bash
cmp -s main.js /Users/carlos/Coding/testValut/.obsidian/plugins/obsidian-task-hub/main.js
cmp -s manifest.json /Users/carlos/Coding/testValut/.obsidian/plugins/obsidian-task-hub/manifest.json
cmp -s src/styles.css /Users/carlos/Coding/testValut/.obsidian/plugins/obsidian-task-hub/styles.css
```

## Obsidian 特别注意

- `workspace.getLeaf("tab")` 用于在主编辑区新标签页打开 Task Hub。
- 已打开 Task Hub 时应 reveal 现有 leaf，避免重复打开多个 Task Hub。
- 命令面板里的命令名称在插件加载时注册；语言切换后可能需要重载插件才会更新命令名称。
- Obsidian runtime 行为不能只靠单元测试确认，重要 UI/工作区行为要在真实 vault 里验证。

## Git 和远端

当前远端 PR 是：

```text
https://github.com/saralaaga/ObPlugin/pull/1
```

本机 git 全局代理可能配置为 `127.0.0.1:7897`。如果代理未启动，push 可能卡住或失败。之前可用的推送方式是临时清空代理：

```bash
git -c http.proxy= -c https.proxy= push
```

如果直连 GitHub 也超时，不要反复无限等待。记录本地 commit hash、验证结果和 `[ahead N]` 状态，让后续在网络恢复后补推。

提交信息遵循项目已有 Lore 风格：第一行写“为什么改”，正文说明约束和取舍，尾部记录 `Constraint:`、`Rejected:`、`Confidence:`、`Scope-risk:`、`Tested:`、`Not-tested:` 等信息。

## 给后续 agent 的提醒

- 用户偏好中文说明和可验证结果。
- 不要把未验证的 Obsidian 手工行为说成已经验证。
- 远端推送失败时继续诊断网络，但不要把本地已完成和已推送混为一谈。
- 维护 Apple Reminders / Apple Calendar 本地集成时，保持 macOS-only 降级和只读边界；不要在未设计写入流程前完成或修改系统提醒事项。
