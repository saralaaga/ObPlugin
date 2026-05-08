# Manual Test Vault

Use this document to verify Task Hub inside a real Obsidian vault.

## Sample Note

Create `Project A.md` in a test vault:

```md
# Project A

- [ ] Overdue task #work 📅 2026-05-01
- [ ] Today task #work due:: 2026-05-05
- [ ] No date task #misc
- [x] Completed task #done
```

## Load Plugin

1. Run `npm run build`.
2. Copy `manifest.json`, `main.js`, and `styles.css` into `.obsidian/plugins/obsidian-task-hub/`.
3. Enable the plugin in Obsidian community plugin settings.
4. Run the `Open Task Hub` command or click the ribbon icon.

## Verification Checklist

- Task Hub opens without console errors.
- The dashboard shows indexed task counts.
- Open tasks are shown by default.
- Completed tasks are hidden until the status filter is set to Completed or All.
- Tasks are grouped into overdue, today, this week, future, and no date buckets.
- Filtering by `#work` shows the two work tasks.
- Text search finds `Today task`.
- Source search finds tasks in `Project A.md`.
- Clicking a task opens `Project A.md` and moves the editor near the task line.
- Clicking a task checkbox updates `- [ ]` to `- [x]` in the source note.
- If the source line is manually changed before clicking the checkbox, Task Hub shows a conflict instead of changing the wrong line.
- The Tags view shows `#work`, `#misc`, and `#done` statistics.
- Clicking `#work` in Tags returns to Tasks with the tag filter applied.
- The Calendar view shows dated tasks on day, week, and month views.
- Calendar layer buttons can hide and show Vault tasks.
- Adding a bad ICS URL in settings shows a sync failure state.
- Adding a valid public ICS URL shows events after Sync.

## Known Manual Gaps

- Large-vault scan responsiveness should be checked with a real large vault.
- ICS compatibility should be checked with real public calendars that include timezone and folded fields.
- Mobile and narrow-pane layouts need visual review inside Obsidian.

## 本地 Apple Helper 测试

- [ ] 运行 `npm run build:apple-helper`。
- [ ] 运行 `npm run build`。
- [ ] 将 `manifest.json`、`main.js`、`src/styles.css` 和 `taskhub-apple-helper` 同步到测试 vault 插件目录。
- [ ] 在 Obsidian 中打开 Task Hub 设置。
- [ ] 开启 Apple 提醒事项。
- [ ] 点击“检查状态”，确认不再显示 AppleScript/JXA 超时。
- [ ] 点击“请求权限”，在 macOS 权限弹窗中允许提醒事项访问。
- [ ] 点击“同步”，确认 Apple Reminders 只读任务出现在任务列表。
- [ ] 开启 Apple 日历。
- [ ] 点击“请求权限”，允许日历访问。
- [ ] 点击“同步”，确认日历事件出现在日/周/月视图。
- [ ] 在 macOS 系统设置中拒绝权限后再次同步，确认显示“权限已拒绝”而不是“解析错误”或“超时”。
