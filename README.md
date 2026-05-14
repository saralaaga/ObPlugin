# Task Hub

[中文文档](README.zh-CN.md)

Task Hub is a desktop-only Obsidian plugin that brings scattered Markdown tasks into one focused workspace. It indexes tasks across your vault and presents them in task, calendar, and tag views, so you can review commitments without leaving your notes.

## Features

- Index Markdown tasks written as `- [ ]` and `- [x]`.
- Open the source note from a task and jump near the original line.
- Safely complete vault tasks after verifying that the source line still matches the indexed task.
- Browse tasks in task, calendar, and tag views.
- Filter by completion state, source, tags, date bucket, text, and custom AND/OR conditions.
- Extract due dates written as `📅 YYYY-MM-DD` or `due:: YYYY-MM-DD`.
- Show dated tasks and external events in day, week, and month calendar views.
- Reschedule vault Markdown tasks, and Apple Reminders when writeback is enabled, by dragging dated task cards to another calendar day.
- Add read-only public ICS calendar sources.
- Read local Apple Reminders and Apple Calendar data on macOS desktop when the local helper is available.
- Explicitly send a vault Markdown task to Apple Reminders from the editor context menu, the command palette, a user-assigned hotkey, or Task Hub task details when reminder creation is enabled.
- Switch between English and Chinese from the plugin settings.

## Usage

After enabling Task Hub, use the ribbon icon or the command **Open Task Hub** to open the workspace.

The task view shows vault tasks and supported external task sources in one list. Use the left sidebar to narrow tasks by source or tag. Use the top toolbar to show or hide completed tasks, apply condition filters, search by text, or rescan the vault.

When Local Apple and Apple Reminders are enabled, the separate **Create Apple Reminders from vault tasks** setting allows one-at-a-time export from vault Markdown tasks. Use the editor right-click menu on a task line, the command **Send current task to Apple Reminders**, an Obsidian hotkey assigned to that command, or the Task Hub task detail action.

The calendar view combines dated tasks, public ICS events, Apple Calendar events, and dated Apple Reminders where available. You can switch between month, week, and day layouts. Drag a vault Markdown task card to another day to update its existing `📅 YYYY-MM-DD` or `due:: YYYY-MM-DD` date. When Apple Reminders completion writeback is enabled, dated Apple Reminder cards can also be dragged to change their due date.

The tag view groups indexed tasks by tag and lets you drill into a tag's related tasks.

## Current Scope

Task Hub intentionally keeps the first releases conservative:

- Vault Markdown tasks can be completed from Task Hub.
- Vault Markdown tasks with an existing supported date can be rescheduled from the calendar.
- Vault Markdown tasks can be sent to Apple Reminders only by explicit user action, and Task Hub records the created reminder id to avoid duplicate sends.
- Apple Reminders completion and date writeback are optional and must be enabled in settings.
- Apple Calendar events and public ICS events are read-only.
- Full Obsidian Tasks plugin grammar is not implemented.
- Timed Markdown task syntax, Google Calendar OAuth, Microsoft Calendar OAuth, and mobile support are not included yet.

## Privacy

Task Hub indexes Markdown files inside your local vault and stores plugin settings in your vault's Obsidian plugin data. Public ICS sources are fetched only from URLs you configure. Local Apple integration runs only on macOS desktop and asks macOS for Reminders or Calendar access before reading local data.

Task Hub does not send vault tasks to a remote service.

## Installation

When Task Hub is published in the Obsidian community plugin directory, install it from **Settings -> Community plugins -> Browse**.

For manual installation from a GitHub release:

1. Download `manifest.json`, `main.js`, and `styles.css` from the latest release.
2. Create this folder in your vault: `.obsidian/plugins/task-hub/`.
3. Copy the downloaded files into that folder.
4. Restart Obsidian or reload community plugins, then enable **Task Hub**.

Local Apple Reminders and Apple Calendar support depends on the `taskhub-apple-helper` binary. The Obsidian community plugin installer downloads the standard plugin assets only, so the helper is treated as an optional local/developer capability unless a separate distribution path is provided.

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
npm run dev:hot
npm run smoke
npm run check:apple-helper
npm run diagnose:apple
```

Build the optional Apple helper on macOS:

```bash
npm run build:apple-helper
```

## Release Assets

For an Obsidian community plugin release, the GitHub release tag must match `manifest.json`'s `version` exactly and include these binary attachments:

- `main.js`
- `manifest.json`
- `styles.css`

The repository root also keeps the files expected by the Obsidian submission flow:

- `README.md`
- `LICENSE`
- `manifest.json`
- `versions.json`
