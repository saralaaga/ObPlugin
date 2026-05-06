# Obsidian Task Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first usable Obsidian Task Hub plugin: vault task aggregation, safe jump/complete actions, filters, task/calendar/tag views, responsive layout, large-vault indexing, and read-only multi-source ICS overlays.

**Architecture:** Use a plain TypeScript Obsidian plugin with focused modules and no UI framework in version 1. Keep parsing, indexing, filtering, calendar-source syncing, settings, and DOM rendering separate so future React/full-calendar/OAuth/Tasks-plugin work can replace internals without rewriting the product shell.

**Tech Stack:** TypeScript, Obsidian plugin API, esbuild, Jest or Vitest for pure module tests, plain DOM rendering, Obsidian `requestUrl` for ICS fetches.

---

## Reference Spec

Primary spec: `docs/superpowers/specs/2026-05-05-obsidian-task-hub-design.md`

## File Structure

Create this initial structure:

```text
.
├── manifest.json
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
├── jest.config.cjs
├── src
│   ├── main.ts
│   ├── constants.ts
│   ├── settings.ts
│   ├── types.ts
│   ├── parsing
│   │   ├── taskParser.ts
│   │   └── taskParser.test.ts
│   ├── indexing
│   │   ├── taskIndex.ts
│   │   ├── scanScheduler.ts
│   │   └── taskIndex.test.ts
│   ├── filtering
│   │   ├── filters.ts
│   │   └── filters.test.ts
│   ├── calendar
│   │   ├── dateBuckets.ts
│   │   ├── icsClient.ts
│   │   ├── calendarModel.ts
│   │   └── calendar.test.ts
│   ├── views
│   │   ├── TaskHubView.ts
│   │   ├── renderShell.ts
│   │   ├── renderTasksView.ts
│   │   ├── renderCalendarView.ts
│   │   ├── renderTagsView.ts
│   │   └── renderSettings.ts
│   └── styles.css
└── docs
    └── superpowers
        └── specs
            └── 2026-05-05-obsidian-task-hub-design.md
```

Responsibilities:

- `src/main.ts`: Obsidian plugin lifecycle, command registration, view registration, settings tab registration.
- `src/types.ts`: shared domain types from the spec.
- `src/settings.ts`: settings defaults, load/save helpers, settings tab.
- `src/parsing/taskParser.ts`: Markdown task extraction from one file's text.
- `src/indexing/taskIndex.ts`: task store, cached file state, file event handling.
- `src/indexing/scanScheduler.ts`: time-sliced queue for large-vault scanning.
- `src/filtering/filters.ts`: pure filtering and grouping functions.
- `src/calendar/dateBuckets.ts`: overdue/today/week/month/date-range helpers.
- `src/calendar/icsClient.ts`: request and parse ICS source data with status classification.
- `src/calendar/calendarModel.ts`: merge vault tasks and external events into layer-aware calendar items.
- `src/views/*`: DOM rendering and event wiring.
- `src/styles.css`: plugin-scoped styles.

## Implementation Tasks

### Task 1: Scaffold the Obsidian Plugin Project

**Files:**
- Create: `manifest.json`
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `esbuild.config.mjs`
- Create: `jest.config.cjs`
- Create: `src/constants.ts`
- Create: `src/main.ts`
- Create: `src/styles.css`

- [x] **Step 1: Create plugin metadata**

Create `manifest.json`:

```json
{
  "id": "obsidian-task-hub",
  "name": "Task Hub",
  "version": "0.1.0",
  "minAppVersion": "1.5.0",
  "description": "Gather vault tasks into task, calendar, and tag views.",
  "author": "Carlos",
  "isDesktopOnly": false
}
```

- [x] **Step 2: Create package scripts and dev dependencies**

Create `package.json`:

```json
{
  "name": "obsidian-task-hub",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "node esbuild.config.mjs production",
    "dev": "node esbuild.config.mjs",
    "test": "jest --runInBand",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/jest": "^29.5.12",
    "@types/node": "^20.12.7",
    "builtin-modules": "^3.3.0",
    "esbuild": "^0.21.5",
    "jest": "^29.7.0",
    "obsidian": "^1.5.12",
    "ts-jest": "^29.1.2",
    "typescript": "^5.4.5"
  }
}
```

- [x] **Step 3: Create TypeScript config**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "inlineSourceMap": true,
    "inlineSources": true,
    "module": "ESNext",
    "target": "ES2020",
    "allowJs": false,
    "noImplicitAny": true,
    "moduleResolution": "Node",
    "importHelpers": true,
    "isolatedModules": true,
    "strictNullChecks": true,
    "lib": ["DOM", "ES2020"],
    "types": ["node", "jest"]
  },
  "include": ["src/**/*.ts"]
}
```

- [x] **Step 4: Create build config**

Create `esbuild.config.mjs`:

```js
import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";

const prod = process.argv[2] === "production";

const context = await esbuild.context({
  banner: { js: "/* Obsidian Task Hub */" },
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: ["obsidian", "electron", "@codemirror/autocomplete", "@codemirror/collab", "@codemirror/commands", "@codemirror/language", "@codemirror/lint", "@codemirror/search", "@codemirror/state", "@codemirror/view", "@lezer/common", "@lezer/highlight", "@lezer/lr", ...builtins],
  format: "cjs",
  target: "es2020",
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
  minify: prod
});

if (prod) {
  await context.rebuild();
  await context.dispose();
} else {
  await context.watch();
}
```

- [x] **Step 5: Create Jest config**

Create `jest.config.cjs`:

```js
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testRegex: ".*\\.test\\.ts$"
};
```

- [x] **Step 6: Add constants and minimal plugin lifecycle**

Create `src/constants.ts`:

```ts
export const TASK_HUB_VIEW_TYPE = "task-hub-view";
export const PLUGIN_DISPLAY_NAME = "Task Hub";
```

Create `src/main.ts`:

```ts
import { ItemView, Plugin, WorkspaceLeaf } from "obsidian";
import { PLUGIN_DISPLAY_NAME, TASK_HUB_VIEW_TYPE } from "./constants";
import "./styles.css";

class TaskHubView extends ItemView {
  getViewType(): string {
    return TASK_HUB_VIEW_TYPE;
  }

  getDisplayText(): string {
    return PLUGIN_DISPLAY_NAME;
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1];
    container.empty();
    container.createEl("h2", { text: PLUGIN_DISPLAY_NAME });
    container.createEl("p", { text: "Task Hub is loading." });
  }
}

export default class TaskHubPlugin extends Plugin {
  async onload(): Promise<void> {
    this.registerView(TASK_HUB_VIEW_TYPE, (leaf: WorkspaceLeaf) => new TaskHubView(leaf));

    this.addRibbonIcon("list-checks", PLUGIN_DISPLAY_NAME, () => {
      void this.activateView();
    });

    this.addCommand({
      id: "open-task-hub",
      name: "Open Task Hub",
      callback: () => void this.activateView()
    });
  }

  async onunload(): Promise<void> {
    this.app.workspace.detachLeavesOfType(TASK_HUB_VIEW_TYPE);
  }

  private async activateView(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(TASK_HUB_VIEW_TYPE)[0];
    if (existing) {
      this.app.workspace.revealLeaf(existing);
      return;
    }

    const leaf = this.app.workspace.getRightLeaf(false);
    if (!leaf) return;
    await leaf.setViewState({ type: TASK_HUB_VIEW_TYPE, active: true });
    this.app.workspace.revealLeaf(leaf);
  }
}
```

Create `src/styles.css`:

```css
.task-hub-root {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
```

- [x] **Step 7: Install dependencies**

Run:

```bash
npm install
```

Expected: `package-lock.json` is created and dependencies install.

- [x] **Step 8: Verify scaffold**

Run:

```bash
npm run typecheck
npm run build
```

Expected: both commands pass and `main.js` is generated.

- [x] **Step 9: Commit scaffold**

```bash
git add manifest.json package.json package-lock.json tsconfig.json esbuild.config.mjs jest.config.cjs src
git commit -m "Prepare the plugin shell for task hub development" -m "The project needs a runnable Obsidian plugin surface before feature work can be verified. This adds a minimal TypeScript build, test command, manifest, view registration, command, and ribbon entry." -m "Constraint: Keep version 1 dependency-light and avoid a UI framework until the dashboard behavior is proven\nConfidence: high\nScope-risk: narrow\nTested: npm run typecheck; npm run build\nNot-tested: Manual Obsidian loading"
```

### Task 2: Define Domain Types and Settings

**Files:**
- Create: `src/types.ts`
- Create: `src/settings.ts`
- Modify: `src/main.ts`

- [x] **Step 1: Add shared types**

Create `src/types.ts` with the spec's domain types:

```ts
export type TaskStatusFilter = "open" | "completed" | "all";
export type DefaultView = "tasks" | "calendar" | "tags";
export type WeekStart = "monday" | "sunday";

export type TaskItem = {
  id: string;
  filePath: string;
  line: number;
  rawLine: string;
  text: string;
  completed: boolean;
  tags: string[];
  dueDate?: string;
  heading?: string;
  contextPreview?: string;
  source: "vault";
  scheduledDate?: string;
  startDate?: string;
  priority?: string;
  recurrence?: string;
  createdDate?: string;
  completedDate?: string;
};

export type CalendarEvent = {
  id: string;
  sourceId: string;
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  location?: string;
  description?: string;
  url?: string;
};

export type CalendarSourceStatus =
  | { state: "ok"; lastSyncedAt: string; eventCount: number }
  | {
      state: "error";
      errorType: "network_error" | "http_error" | "invalid_content" | "parse_error";
      message: string;
      statusCode?: number;
      lastAttemptAt: string;
      lastSuccessfulSyncAt?: string;
    }
  | { state: "never" };

export type CalendarSource = {
  id: string;
  name: string;
  type: "ics";
  url: string;
  color: string;
  enabled: boolean;
  refreshIntervalMinutes: number;
  status: CalendarSourceStatus;
};

export type IndexedFileState = {
  path: string;
  ctime: number;
  mtime: number;
  size: number;
  taskIds: string[];
  lastIndexedAt: string;
  lastError?: string;
};

export type TaskHubSettings = {
  defaultView: DefaultView;
  weekStart: WeekStart;
  showCompletedByDefault: boolean;
  indexOnStartup: boolean;
  ignoredPaths: string[];
  calendarSources: CalendarSource[];
};
```

- [x] **Step 2: Add settings defaults and tab**

Create `src/settings.ts`:

```ts
import { App, PluginSettingTab, Setting } from "obsidian";
import type TaskHubPlugin from "./main";
import type { TaskHubSettings } from "./types";

export const DEFAULT_SETTINGS: TaskHubSettings = {
  defaultView: "tasks",
  weekStart: "monday",
  showCompletedByDefault: false,
  indexOnStartup: true,
  ignoredPaths: ["Templates/", "Archive/"],
  calendarSources: []
};

export class TaskHubSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: TaskHubPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Task Hub Settings" });

    new Setting(containerEl)
      .setName("Default view")
      .setDesc("View shown when Task Hub opens.")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("tasks", "Tasks")
          .addOption("calendar", "Calendar")
          .addOption("tags", "Tags")
          .setValue(this.plugin.settings.defaultView)
          .onChange(async (value) => {
            this.plugin.settings.defaultView = value as TaskHubSettings["defaultView"];
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Week starts on")
      .setDesc("Controls week grouping and calendar layout.")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("monday", "Monday")
          .addOption("sunday", "Sunday")
          .setValue(this.plugin.settings.weekStart)
          .onChange(async (value) => {
            this.plugin.settings.weekStart = value as TaskHubSettings["weekStart"];
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Show completed tasks by default")
      .setDesc("Completed tasks remain indexed but hidden unless this is enabled.")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.showCompletedByDefault).onChange(async (value) => {
          this.plugin.settings.showCompletedByDefault = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Index on startup")
      .setDesc("Scan changed Markdown files when Obsidian starts.")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.indexOnStartup).onChange(async (value) => {
          this.plugin.settings.indexOnStartup = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Ignored paths")
      .setDesc("Comma-separated folder or file prefixes.")
      .addTextArea((text) => {
        text
          .setValue(this.plugin.settings.ignoredPaths.join(", "))
          .onChange(async (value) => {
            this.plugin.settings.ignoredPaths = value
              .split(",")
              .map((entry) => entry.trim())
              .filter(Boolean);
            await this.plugin.saveSettings();
          });
      });

    containerEl.createEl("h3", { text: "Supported task syntax" });
    containerEl.createEl("p", {
      text: "Version 1 supports - [ ], - [x], Obsidian tags, 📅 YYYY-MM-DD, and due:: YYYY-MM-DD."
    });
  }
}
```

- [x] **Step 3: Wire settings into plugin lifecycle**

Modify `src/main.ts` so `TaskHubPlugin` has `settings`, `loadSettings`, `saveSettings`, and `addSettingTab(new TaskHubSettingTab(...))`.

- [x] **Step 4: Verify**

Run:

```bash
npm run typecheck
```

Expected: typecheck passes.

- [x] **Step 5: Commit**

```bash
git add src/main.ts src/types.ts src/settings.ts
git commit -m "Keep task hub preferences explicit before indexing data" -m "Settings define the user-visible boundaries for default view, week start, completion visibility, startup indexing, ignored paths, and future calendar sources before services depend on them." -m "Confidence: high\nScope-risk: narrow\nTested: npm run typecheck\nNot-tested: Settings tab manual interaction in Obsidian"
```

### Task 3: Implement Markdown Task Parsing

**Files:**
- Create: `src/parsing/taskParser.ts`
- Create: `src/parsing/taskParser.test.ts`

- [x] **Step 1: Write parser tests**

Create `src/parsing/taskParser.test.ts`:

```ts
import { parseTasksFromMarkdown } from "./taskParser";

describe("parseTasksFromMarkdown", () => {
  it("extracts open tasks with tags and emoji due dates", () => {
    const tasks = parseTasksFromMarkdown({
      filePath: "Projects/Acme.md",
      content: "# Acme\n\n- [ ] Write proposal #client/acme 📅 2026-05-10"
    });

    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      filePath: "Projects/Acme.md",
      line: 2,
      completed: false,
      text: "Write proposal",
      tags: ["#client/acme"],
      dueDate: "2026-05-10",
      heading: "Acme"
    });
  });

  it("extracts completed tasks with due:: dates", () => {
    const tasks = parseTasksFromMarkdown({
      filePath: "Inbox.md",
      content: "- [x] Send invoice #finance due:: 2026-05-11"
    });

    expect(tasks[0]).toMatchObject({
      completed: true,
      text: "Send invoice",
      tags: ["#finance"],
      dueDate: "2026-05-11"
    });
  });

  it("ignores non-task checkboxes and malformed dates", () => {
    const tasks = parseTasksFromMarkdown({
      filePath: "Inbox.md",
      content: "- [?] Maybe\n- [ ] Keep this 📅 tomorrow"
    });

    expect(tasks).toHaveLength(1);
    expect(tasks[0].dueDate).toBeUndefined();
  });
});
```

- [x] **Step 2: Run tests and see failure**

Run:

```bash
npm test -- src/parsing/taskParser.test.ts
```

Expected: test fails because `taskParser.ts` does not exist.

- [x] **Step 3: Implement parser**

Create `src/parsing/taskParser.ts`:

```ts
import type { TaskItem } from "../types";

type ParseInput = {
  filePath: string;
  content: string;
};

const TASK_LINE = /^(\s*)- \[([ xX])\]\s+(.*)$/;
const TAG = /(^|\s)(#[\p{L}\p{N}_/-]+)/gu;
const EMOJI_DUE = /(?:^|\s)📅\s*(\d{4}-\d{2}-\d{2})(?=\s|$)/u;
const INLINE_DUE = /(?:^|\s)due::\s*(\d{4}-\d{2}-\d{2})(?=\s|$)/u;
const HEADING = /^(#{1,6})\s+(.+)$/;

export function parseTasksFromMarkdown(input: ParseInput): TaskItem[] {
  const lines = input.content.split(/\r?\n/);
  const tasks: TaskItem[] = [];
  let currentHeading: string | undefined;

  lines.forEach((line, index) => {
    const headingMatch = line.match(HEADING);
    if (headingMatch) {
      currentHeading = headingMatch[2].trim();
      return;
    }

    const match = line.match(TASK_LINE);
    if (!match) return;

    const rawBody = match[3].trim();
    const tags = extractTags(rawBody);
    const dueDate = extractDueDate(rawBody);
    const text = cleanTaskText(rawBody).trim();

    tasks.push({
      id: createTaskId(input.filePath, index, line),
      filePath: input.filePath,
      line: index,
      rawLine: line,
      text,
      completed: match[2].toLowerCase() === "x",
      tags,
      dueDate,
      heading: currentHeading,
      contextPreview: buildContextPreview(lines, index),
      source: "vault"
    });
  });

  return tasks;
}

function extractTags(text: string): string[] {
  return Array.from(text.matchAll(TAG), (match) => match[2]);
}

function extractDueDate(text: string): string | undefined {
  return text.match(EMOJI_DUE)?.[1] ?? text.match(INLINE_DUE)?.[1];
}

function cleanTaskText(text: string): string {
  return text
    .replace(EMOJI_DUE, " ")
    .replace(INLINE_DUE, " ")
    .replace(TAG, " ")
    .replace(/\s+/g, " ");
}

function buildContextPreview(lines: string[], taskLine: number): string {
  const start = Math.max(0, taskLine - 1);
  const end = Math.min(lines.length, taskLine + 2);
  return lines.slice(start, end).join("\n");
}

function createTaskId(filePath: string, line: number, rawLine: string): string {
  return `${filePath}:${line}:${hash(rawLine)}`;
}

function hash(value: string): string {
  let result = 5381;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 33) ^ value.charCodeAt(index);
  }
  return (result >>> 0).toString(36);
}
```

- [x] **Step 4: Verify parser tests**

Run:

```bash
npm test -- src/parsing/taskParser.test.ts
npm run typecheck
```

Expected: parser tests and typecheck pass.

- [x] **Step 5: Commit**

```bash
git add src/parsing src/types.ts
git commit -m "Make vault task parsing deterministic before indexing" -m "The index needs a pure parser that extracts the first supported Markdown task grammar without depending on Obsidian runtime state. It captures file path, line, raw source, text, tags, due dates, heading, and preview context for later UI use." -m "Constraint: Version 1 reserves Tasks-plugin fields but does not parse that grammar\nConfidence: high\nScope-risk: narrow\nTested: npm test -- src/parsing/taskParser.test.ts; npm run typecheck\nNot-tested: Non-English tag edge cases beyond Unicode letters and numbers"
```

### Task 4: Implement Filtering and Date Buckets

**Files:**
- Create: `src/calendar/dateBuckets.ts`
- Create: `src/filtering/filters.ts`
- Create: `src/filtering/filters.test.ts`

- [x] **Step 1: Write filter tests**

Create `src/filtering/filters.test.ts` with fixtures covering open/completed filters, overdue/today/week/no-date groups, tag filters, source filters, and text search.

- [x] **Step 2: Implement date helpers**

Create `src/calendar/dateBuckets.ts` with pure helpers:

```ts
export type DateBucket = "overdue" | "today" | "thisWeek" | "future" | "noDate";

export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTaskDateBucket(dueDate: string | undefined, now: Date): DateBucket {
  if (!dueDate) return "noDate";
  const today = toLocalDateKey(now);
  if (dueDate < today) return "overdue";
  if (dueDate === today) return "today";
  if (isWithinNextDays(dueDate, now, 7)) return "thisWeek";
  return "future";
}

function isWithinNextDays(dateKey: string, now: Date, days: number): boolean {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(start.getDate() + days);
  const candidate = new Date(`${dateKey}T00:00:00`);
  return candidate > start && candidate <= end;
}
```

- [x] **Step 3: Implement filter functions**

Create `src/filtering/filters.ts` with:

```ts
import { getTaskDateBucket, type DateBucket } from "../calendar/dateBuckets";
import type { TaskItem, TaskStatusFilter } from "../types";

export type TaskFilterState = {
  status: TaskStatusFilter;
  dateBucket?: DateBucket;
  tags: string[];
  sourceQuery: string;
  textQuery: string;
};

export function filterTasks(tasks: TaskItem[], filters: TaskFilterState, now: Date): TaskItem[] {
  const sourceQuery = filters.sourceQuery.toLowerCase();
  const textQuery = filters.textQuery.toLowerCase();

  return tasks.filter((task) => {
    if (filters.status === "open" && task.completed) return false;
    if (filters.status === "completed" && !task.completed) return false;
    if (filters.dateBucket && getTaskDateBucket(task.dueDate, now) !== filters.dateBucket) return false;
    if (filters.tags.length > 0 && !filters.tags.every((tag) => task.tags.includes(tag))) return false;
    if (sourceQuery && !task.filePath.toLowerCase().includes(sourceQuery)) return false;
    if (textQuery && !task.text.toLowerCase().includes(textQuery)) return false;
    return true;
  });
}

export function groupTasksByDateBucket(tasks: TaskItem[], now: Date): Record<DateBucket, TaskItem[]> {
  return tasks.reduce<Record<DateBucket, TaskItem[]>>(
    (groups, task) => {
      groups[getTaskDateBucket(task.dueDate, now)].push(task);
      return groups;
    },
    { overdue: [], today: [], thisWeek: [], future: [], noDate: [] }
  );
}
```

- [x] **Step 4: Verify**

Run:

```bash
npm test -- src/filtering/filters.test.ts
npm run typecheck
```

Expected: tests and typecheck pass.

- [x] **Step 5: Commit**

Commit filtering/date helper changes with Lore trailers and test evidence.

### Task 5: Implement Time-Sliced Vault Indexing

**Files:**
- Create: `src/indexing/scanScheduler.ts`
- Create: `src/indexing/taskIndex.ts`
- Create: `src/indexing/taskIndex.test.ts`
- Modify: `src/main.ts`

- [x] **Step 1: Write pure index tests**

Create tests for:

- unchanged `mtime + size` skips file parsing
- changed file replaces old tasks
- deleted file removes tasks
- ignored path is skipped
- failed file stores `lastError` without stopping other files

- [x] **Step 2: Implement scan scheduler**

Create `src/indexing/scanScheduler.ts` with a queue that processes jobs until either the batch size or time budget is reached, then schedules the next batch with `window.setTimeout(..., 0)`.

- [x] **Step 3: Implement task index service**

Create `src/indexing/taskIndex.ts`:

- Hold `tasksById`
- Hold `fileStateByPath`
- Expose `getTasks()`
- Expose `scanVault()`
- Expose `reindexFile(file)`
- Expose `removeFile(path)`
- Use `app.vault.cachedRead(file)` for read-only parsing
- Compare `file.stat.mtime` and `file.stat.size`
- Respect ignored paths

- [x] **Step 4: Register vault events**

In `src/main.ts`, create the index service and register:

- `this.app.vault.on("modify", ...)`
- `this.app.vault.on("create", ...)`
- `this.app.vault.on("delete", ...)`
- `this.app.vault.on("rename", ...)`

Start `scanVault()` on layout ready when `settings.indexOnStartup` is true.

- [x] **Step 5: Verify**

Run:

```bash
npm test -- src/indexing/taskIndex.test.ts
npm run typecheck
```

Expected: tests and typecheck pass.

- [x] **Step 6: Commit**

Commit indexing service changes with test evidence.

### Task 6: Implement Safe Completion and Jump Actions

**Files:**
- Modify: `src/indexing/taskIndex.ts`
- Create: `src/indexing/taskActions.test.ts`

- [x] **Step 1: Write safe completion tests**

Cover:

- direct line match updates `- [ ]` to `- [x]`
- nearby line search handles line drift
- already completed task is a no-op
- no safe match returns conflict without modifying content

- [x] **Step 2: Implement completion helper**

Add a pure helper that accepts current file content and `TaskItem`, returning:

```ts
type CompletionResult =
  | { status: "updated"; content: string; line: number }
  | { status: "already_completed" }
  | { status: "conflict"; message: string };
```

- [x] **Step 3: Wire Obsidian write path**

Use `app.vault.process(file, fn)` when available to do read-modify-write safely. After a successful update, reindex that file.

- [x] **Step 4: Implement jump path**

Add a method that opens the file and positions the editor near the task line using Obsidian workspace APIs. If line-specific positioning is unavailable in the target leaf, open the file and show a notice.

- [x] **Step 5: Verify**

Run:

```bash
npm test -- src/indexing/taskActions.test.ts
npm run typecheck
```

Expected: tests and typecheck pass.

- [x] **Step 6: Commit**

Commit safe task actions with Lore trailers and test evidence.

### Task 7: Build the Dashboard Shell and Tasks View

**Files:**
- Create: `src/views/TaskHubView.ts`
- Create: `src/views/renderShell.ts`
- Create: `src/views/renderTasksView.ts`
- Modify: `src/main.ts`
- Modify: `src/styles.css`

- [x] **Step 1: Move inline view into `TaskHubView.ts`**

The view should receive plugin services through constructor options, render a root element with class `task-hub-root`, and re-render when index state changes.

- [x] **Step 2: Render top bar and sidebar**

Create view switch buttons, search input, rescan button, settings button, status filter, date filter, tag list, source search, and layer toggles.

- [x] **Step 3: Render grouped tasks**

Use `filterTasks()` and `groupTasksByDateBucket()` to render default groups. Each row includes checkbox, text, due date, tags, and source file.

- [x] **Step 4: Wire interactions**

- Checkbox calls safe completion.
- Task row click jumps to source line.
- Filters update in-memory view state and re-render.
- Rescan calls index service.

- [x] **Step 5: Add responsive styles**

Use CSS grid for three-column layout, then media/container width classes to collapse detail/sidebar behavior.

- [x] **Step 6: Verify**

Run:

```bash
npm run typecheck
npm run build
```

Expected: typecheck and build pass.

- [x] **Step 7: Commit**

Commit the dashboard shell and Tasks view.

### Task 8: Implement Tag Statistics and Drilldown

**Files:**
- Create: `src/views/renderTagsView.ts`
- Create: `src/filtering/tagStats.ts`
- Create: `src/filtering/tagStats.test.ts`
- Modify: `src/views/TaskHubView.ts`

- [x] **Step 1: Write tag stats tests**

Cover total, open, overdue, and this-week counts per tag.

- [x] **Step 2: Implement tag stats**

Create a pure `buildTagStats(tasks, now)` function.

- [x] **Step 3: Render Tags view**

Render tags as compact statistic rows/cards. Clicking a tag switches back to Tasks view with that tag filter applied.

- [x] **Step 4: Verify**

Run:

```bash
npm test -- src/filtering/tagStats.test.ts
npm run typecheck
npm run build
```

Expected: tests, typecheck, and build pass.

- [x] **Step 5: Commit**

Commit tag statistics and drilldown.

### Task 9: Implement Calendar Model and Calendar View

**Files:**
- Create: `src/calendar/calendarModel.ts`
- Create: `src/calendar/calendar.test.ts`
- Create: `src/views/renderCalendarView.ts`
- Modify: `src/views/TaskHubView.ts`
- Modify: `src/styles.css`

- [x] **Step 1: Write calendar model tests**

Cover conversion of dated tasks to all-day calendar items, source layer filtering, completed-task layer behavior, and month/day/week ranges.

- [x] **Step 2: Implement calendar model**

Create functions that merge `TaskItem[]` and `CalendarEvent[]` into renderable calendar items.

- [x] **Step 3: Render day/week/month views**

Implement a lightweight DOM calendar:

- Month grid with weekday headers and overflow count.
- Week columns with items per day.
- Day list with all tasks/events for that day.

- [x] **Step 4: Wire view controls**

Add day/week/month switch, previous/next/today buttons, and layer toggles.

- [x] **Step 5: Verify**

Run:

```bash
npm test -- src/calendar/calendar.test.ts
npm run typecheck
npm run build
```

Expected: tests, typecheck, and build pass.

- [x] **Step 6: Commit**

Commit calendar model and view.

### Task 10: Implement ICS Source Sync and Settings UI

**Files:**
- Create: `src/calendar/icsClient.ts`
- Create: `src/calendar/icsClient.test.ts`
- Modify: `src/settings.ts`
- Modify: `src/views/TaskHubView.ts`
- Modify: `src/types.ts`

- [x] **Step 1: Write ICS status tests**

Cover:

- network exception maps to `network_error`
- HTTP 403 maps to `http_error`
- HTML response maps to `invalid_content`
- invalid VCALENDAR maps to `parse_error`
- valid empty VCALENDAR maps to ok with 0 events
- valid VEVENT maps to `CalendarEvent`

- [x] **Step 2: Implement minimal ICS parser**

Implement enough parsing for version 1:

- `BEGIN:VCALENDAR`
- `BEGIN:VEVENT` / `END:VEVENT`
- `UID`
- `SUMMARY`
- `DTSTART`
- `DTEND`
- `LOCATION`
- `DESCRIPTION`
- `URL`

Keep the parser small. If multiline folding becomes too error-prone, document the need for an ICS dependency and request that decision before adding it.

- [x] **Step 3: Implement fetch status classification**

Use Obsidian `requestUrl` in runtime code and inject a fake requester in tests.

- [x] **Step 4: Extend settings UI**

Add add/edit/remove controls for ICS sources:

- name
- URL
- color
- enabled
- refresh interval
- sync status

- [x] **Step 5: Store cached events**

Persist last successful events and status in plugin data. Failed sync keeps showing last successful events.

- [x] **Step 6: Verify**

Run:

```bash
npm test -- src/calendar/icsClient.test.ts
npm run typecheck
npm run build
```

Expected: tests, typecheck, and build pass.

- [x] **Step 7: Commit**

Commit ICS sync and settings UI.

### Task 11: Polish UX, Index Status, and Error States

**Files:**
- Modify: `src/views/renderShell.ts`
- Modify: `src/views/renderTasksView.ts`
- Modify: `src/views/renderCalendarView.ts`
- Modify: `src/views/renderTagsView.ts`
- Modify: `src/views/renderSettings.ts`
- Modify: `src/styles.css`

- [x] **Step 1: Add index status display**

Show indexed files, task count, pending count, failed count, and last scan time.

- [x] **Step 2: Add empty states**

Provide clear empty states for:

- no tasks
- no tasks matching filters
- calendar day/week/month with no items
- no tags
- no ICS sources

- [x] **Step 3: Add conflict and sync notices**

Use Obsidian notices or inline messages for task completion conflicts and ICS failures.

- [x] **Step 4: Review visual density**

Confirm three-column, two-column, and single-column states do not overlap text or controls.

- [x] **Step 5: Verify**

Run:

```bash
npm run typecheck
npm run build
npm test
```

Expected: all pass.

- [x] **Step 6: Commit**

Commit UX polish.

### Task 12: Manual Obsidian Verification

**Files:**
- Create: `docs/manual-test-vault.md`
- Modify: `README.md`

- [x] **Step 1: Create manual test instructions**

Document a small test vault with:

```md
# Project A

- [ ] Overdue task #work 📅 2026-05-01
- [ ] Today task #work due:: 2026-05-05
- [ ] No date task #misc
- [x] Completed task #done
```

- [x] **Step 2: Document local plugin loading**

Add README instructions for copying or symlinking the plugin into an Obsidian vault's `.obsidian/plugins/obsidian-task-hub/`.

- [x] **Step 3: Run final automated verification**

Run:

```bash
npm test
npm run typecheck
npm run build
```

Expected: all pass.

- [ ] **Step 4: Run manual verification**

In Obsidian:

- enable the plugin
- open Task Hub
- verify grouped tasks
- click jump to source line
- complete a task
- switch to Calendar day/week/month
- switch to Tags and drill into a tag
- add a sample ICS source
- verify failure status with a bad URL

Status: documented in `docs/manual-test-vault.md`, but not executed in this environment because it requires loading the plugin in a real Obsidian vault.

- [x] **Step 5: Commit docs and final fixes**

Commit README/manual verification notes and any fixes found during manual QA.

## Plan Self-Review

Spec coverage:

- Vault task parsing: Tasks 3 and 5.
- Jump and completion: Task 6.
- Filters and grouping: Task 4 and Task 7.
- Calendar views: Task 9.
- Tags view: Task 8.
- ICS source handling: Task 10.
- Large-vault indexing: Task 5 and Task 11.
- Settings: Task 2 and Task 10.
- Verification: Tasks 1-12 include automated checks and final manual QA.

Known implementation decisions:

- Version 1 uses plain TypeScript and DOM rendering rather than React.
- Version 1 starts with a lightweight calendar renderer rather than adding a calendar UI dependency.
- Version 1 starts with a minimal ICS parser; if real-world ICS compatibility proves too broad, add a focused dependency through an explicit follow-up decision.

Remaining risks:

- Obsidian editor line-jump APIs may need runtime adjustment during manual QA.
- ICS parsing can become complex if public calendars rely heavily on timezone definitions or folded fields.
- Large vault performance must be checked in a real Obsidian runtime, not only unit tests.

## Completion Evidence

Implementation reached Task 12 on branch `feat/task-hub-scaffold` and PR #1.

Automated verification run after Task 12:

- `npm test`: 7 suites, 30 tests passed.
- `npm run typecheck`: passed.
- `npm run build`: passed.

Manual Obsidian verification was documented in `docs/manual-test-vault.md` but not executed in this environment.
