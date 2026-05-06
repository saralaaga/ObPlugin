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

## Notes

- `main.js` is generated and not committed.
- `node_modules/` is ignored.
- Full Obsidian Tasks plugin grammar, OAuth calendars, full task editing, and saved filter views are planned later, not part of the first release.
