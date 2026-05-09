import { ItemView, WorkspaceLeaf } from "obsidian";
import { TASK_HUB_VIEW_TYPE } from "../constants";
import { filterTasks, sortTasksByCompletion, type TaskFilterState } from "../filtering/filters";
import { createTranslator } from "../i18n";
import type TaskHubPlugin from "../main";
import type { TaskItem } from "../types";
import { type CalendarViewMode } from "../calendar/calendarModel";
import { renderCalendarView } from "./renderCalendarView";
import { renderShell, type DashboardView } from "./renderShell";
import { syncVisibleSources } from "./sourceVisibility";
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
  private knownCalendarSourceIds = new Set<string>(["vault"]);
  private selectedTaskId: string | undefined;

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
    return createTranslator(this.plugin.settings.language)("taskHub");
  }

  async onOpen(): Promise<void> {
    this.render();
  }

  render(): void {
    const container = this.containerEl.children[1] as HTMLElement;
    const allTasks = this.plugin.getTasks();
    const calendarSources = this.plugin.getCalendarSources();
    const calendarSourceIds = ["vault", ...calendarSources.map((source) => source.id)];
    syncVisibleSources(this.visibleSourceIds, this.knownCalendarSourceIds, calendarSourceIds);
    const t = createTranslator(this.plugin.settings.language);
    const main = renderShell(
      container,
      {
        view: this.view,
        filters: this.filters,
        availableTags: collectTags(allTasks),
        stats: this.plugin.taskIndex.getStats(),
        t
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
        onTextQueryChange: (textQuery) => {
          this.filters = { ...this.filters, textQuery };
          this.render();
        }
      }
    );

    if (this.view === "tasks") {
      const visibleTasks = filterTasks(allTasks, this.filters, new Date());
      if (visibleTasks.length > 0 && !visibleTasks.some((task) => task.id === this.selectedTaskId)) {
        this.selectedTaskId = sortTasksByCompletion(visibleTasks)[0].id;
      }
      renderTasksView(
        main,
        visibleTasks,
        allTasks,
        this.filters,
        {
          onComplete: (task) => void this.plugin.completeTask(task),
          onJump: (task) => void this.plugin.jumpToTask(task),
          onSelect: (task) => {
            this.selectedTaskId = task.id;
            this.render();
          },
          onTagSelect: (tag) => {
            this.filters = {
              ...this.filters,
              tags: this.filters.tags.includes(tag)
                ? this.filters.tags.filter((existing) => existing !== tag)
                : [...this.filters.tags, tag]
            };
            this.render();
          },
          onTagQueryChange: (tagQuery) => {
            this.filters = { ...this.filters, tagQuery };
            this.render();
          },
          onSourceSelect: (source) => {
            this.filters = { ...this.filters, sourceQuery: source === "all" ? "" : source };
            this.render();
          }
        },
        new Date(),
        t,
        {
          allowAppleReminderWriteback: this.plugin.settings.localApple.remindersWritebackEnabled,
          selectedTaskId: this.selectedTaskId
        }
      );
      return;
    }

    if (this.view === "tags") {
      const visibleTagTasks = this.filters.status === "open" ? allTasks.filter((task) => !task.completed) : allTasks;
      renderTagsView(
        main,
        visibleTagTasks,
        {
          onTagSelect: (tag) => {
            this.view = "tasks";
            this.filters = { ...this.filters, tags: [tag] };
            this.render();
          },
          onTaskComplete: (task) => void this.plugin.completeTask(task),
          onTaskSelect: (task) => {
            this.view = "tasks";
            this.selectedTaskId = task.id;
            this.filters = { ...this.filters, tags: [] };
            this.render();
          }
        },
        t,
        {
          allowAppleReminderWriteback: this.plugin.settings.localApple.remindersWritebackEnabled
        }
      );
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
          allowAppleReminderWriteback: this.plugin.settings.localApple.remindersWritebackEnabled,
          sources: calendarSources,
          t
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
          onTaskComplete: (task) => void this.plugin.completeTask(task),
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
