# Task Hub

Task Hub is an Obsidian plugin that gathers Markdown tasks from a vault into task, calendar, and tag views.

## Current Features

- Scans Markdown tasks written as `- [ ]` and `- [x]`.
- Supports English and Chinese UI from the plugin settings.
- Extracts task text, tags, source file, line number, heading context, and due dates.
- Supports due dates written as `📅 YYYY-MM-DD` or `due:: YYYY-MM-DD`.
- Groups open tasks by overdue, today, this week, future, and no date.
- Filters by status, date bucket, tag, source path, and text.
- Opens a task's source note and positions the editor near the task line.
- Marks tasks complete only when the source line can be verified safely.
- Shows tag statistics and drills into a tag-filtered task list.
- Shows dated tasks and ICS events in day, week, and month calendar views.
- Supports multiple read-only public ICS sources with status reporting and cached events.
- Supports read-only local Apple Reminders and Apple Calendar sync on macOS desktop.

## Development

Install dependencies:

```bash
npm install
```

Run checks:

```bash
npm test
npm run typecheck
npm run build
```

Run a watch build:

```bash
npm run dev
```

## Local Obsidian Loading

Build the plugin:

```bash
npm run build
```

Create or choose a test vault, then create the plugin directory:

```bash
mkdir -p /path/to/vault/.obsidian/plugins/obsidian-task-hub
```

Copy these files into that directory:

```bash
cp manifest.json main.js styles.css /path/to/vault/.obsidian/plugins/obsidian-task-hub/
```

In Obsidian, enable community plugins, reload plugins if needed, then enable `Task Hub`.

## Local Apple Sync

Task Hub can read local Apple Reminders and Apple Calendar data on macOS desktop.

普通用户不需要安装 Xcode、Homebrew 或其他 Obsidian 插件。正式发布包会包含一个小型 `taskhub-apple-helper`，插件通过它调用 Apple EventKit。

开发者如果从源码构建 Apple helper，需要 macOS 和 Swift 工具链：

```bash
npm run build:apple-helper
npm run check:apple-helper
```

Apple 集成默认关闭。第一次开启后，请在设置页点击“请求权限”，并在 macOS 权限弹窗中允许 Task Hub 访问提醒事项或日历。

当前边界：

- 只读读取 Reminders / Calendar。
- 不创建、不修改、不完成 Apple 系统任务或日程。
- 仅支持 Obsidian 桌面端 macOS。
- Windows、Linux、移动端会自动降级为不可用状态。

## Notes

- `main.js` is generated and not committed.
- `node_modules/` is ignored.
- Full Obsidian Tasks plugin grammar, OAuth calendars, full task editing, and saved filter views are planned later, not part of the first release.
