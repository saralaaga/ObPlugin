import { ItemView, WorkspaceLeaf } from "obsidian";
import { TASK_HUB_VIEW_TYPE } from "../constants";
import { filterTasks, type TaskFilterState } from "../filtering/filters";
import { buildTagStats } from "../filtering/tagStats";
import type TaskHubPlugin from "../main";
import type { TaskItem } from "../types";
import { type CalendarViewMode } from "../calendar/calendarModel";
import { renderCalendarView } from "./renderCalendarView";
import { renderShell, type DashboardView } from "./renderShell";
import { renderTagsView } from "./renderTagsView";
import { renderTasksView } from "./renderTasksView";

export class TaskHubView extends ItemView {
  private view: DashboardView = this.plugin.settings.defaultView;
  private filters: TaskFilterState = {
    status: this.plugin.settings.showCompletedByDefault ? "all" : "open",
    tags: [],
    sourceQuery: "",
    textQuery: ""
  };
  private calendarMode: CalendarViewMode = "month";
  private calendarFocusDate = new Date();
  private visibleSourceIds = new Set<string>(["vault"]);

  constructor(
    leaf: WorkspaceLeaf,
    private readonly plugin: TaskHubPlugin
  ) {
    super(leaf);
  }

  getViewType(): string {
    return TASK_HUB_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Task Hub";
  }

  async onOpen(): Promise<void> {
    this.render();
  }

  render(): void {
    const container = this.containerEl.children[1] as HTMLElement;
    const allTasks = this.plugin.taskIndex.getTasks();
    const main = renderShell(
      container,
      {
        view: this.view,
        filters: this.filters,
        availableTags: collectTags(allTasks),
        stats: this.plugin.taskIndex.getStats()
      },
      {
        onViewChange: (view) => {
          this.view = view;
          this.render();
        },
        onRescan: () => void this.plugin.scanVault(),
        onStatusChange: (status) => {
          this.filters = { ...this.filters, status };
          this.render();
        },
        onDateBucketChange: (dateBucket) => {
          this.filters = { ...this.filters, dateBucket };
          this.render();
        },
        onTagToggle: (tag) => {
          this.filters = {
            ...this.filters,
            tags: this.filters.tags.includes(tag)
              ? this.filters.tags.filter((existing) => existing !== tag)
              : [...this.filters.tags, tag]
          };
          this.render();
        },
        onSourceQueryChange: (sourceQuery) => {
          this.filters = { ...this.filters, sourceQuery };
          this.render();
        },
        onTextQueryChange: (textQuery) => {
          this.filters = { ...this.filters, textQuery };
          this.render();
        }
      }
    );

    if (this.view === "tasks") {
      renderTasksView(
        main,
        filterTasks(allTasks, this.filters, new Date()),
        this.filters,
        {
          onComplete: (task) => void this.plugin.completeTask(task),
          onJump: (task) => void this.plugin.jumpToTask(task)
        },
        new Date()
      );
      return;
    }

    if (this.view === "tags") {
      renderTagsView(main, buildTagStats(allTasks, new Date()), {
        onTagSelect: (tag) => {
          this.view = "tasks";
          this.filters = { ...this.filters, tags: [tag] };
          this.render();
        }
      });
      return;
    }

    if (this.view === "calendar") {
      renderCalendarView(
        main,
        {
          mode: this.calendarMode,
          focusDate: this.calendarFocusDate,
          weekStart: this.plugin.settings.weekStart,
          visibleSourceIds: this.visibleSourceIds,
          includeCompletedTasks: this.filters.status !== "open",
          sources: this.plugin.settings.calendarSources
        },
        allTasks,
        this.plugin.getCalendarEvents(),
        {
          onModeChange: (mode) => {
            this.calendarMode = mode;
            this.render();
          },
          onMove: (direction) => {
            this.calendarFocusDate = moveDate(this.calendarFocusDate, this.calendarMode, direction);
            this.render();
          },
          onToday: () => {
            this.calendarFocusDate = new Date();
            this.render();
          },
          onLayerToggle: (sourceId) => {
            this.visibleSourceIds = toggleSetValue(this.visibleSourceIds, sourceId);
            this.render();
          },
          onTaskJump: (task) => void this.plugin.jumpToTask(task)
        }
      );
      return;
    }

  }
}

function collectTags(tasks: TaskItem[]): string[] {
  return Array.from(new Set(tasks.flatMap((task) => task.tags))).sort((a, b) => a.localeCompare(b));
}

function moveDate(date: Date, mode: CalendarViewMode, direction: -1 | 1): Date {
  const next = new Date(date);
  if (mode === "day") next.setDate(next.getDate() + direction);
  if (mode === "week") next.setDate(next.getDate() + direction * 7);
  if (mode === "month") next.setMonth(next.getMonth() + direction);
  return next;
}

function toggleSetValue(values: Set<string>, value: string): Set<string> {
  const next = new Set(values);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}
