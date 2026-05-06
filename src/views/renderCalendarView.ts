import { buildCalendarItems, getCalendarRange, type CalendarItem, type CalendarViewMode } from "../calendar/calendarModel";
import { toLocalDateKey } from "../calendar/dateBuckets";
import type { TranslationKey, Translator } from "../i18n";
import type { CalendarEvent, CalendarSource, CalendarSourceStatus, TaskItem, WeekStart } from "../types";

export type CalendarViewState = {
  mode: CalendarViewMode;
  focusDate: Date;
  weekStart: WeekStart;
  visibleSourceIds: Set<string>;
  includeCompletedTasks: boolean;
  sources: CalendarSource[];
  t: Translator;
};

export type CalendarViewHandlers = {
  onModeChange: (mode: CalendarViewMode) => void;
  onMove: (direction: -1 | 1) => void;
  onToday: () => void;
  onLayerToggle: (sourceId: string) => void;
  onTaskJump: (task: TaskItem) => void;
};

const MODE_LABEL_KEYS: Record<CalendarViewMode, TranslationKey> = {
  day: "day",
  week: "week",
  month: "month"
};

export function renderCalendarView(
  container: HTMLElement,
  state: CalendarViewState,
  tasks: TaskItem[],
  events: CalendarEvent[],
  handlers: CalendarViewHandlers
): void {
  container.empty();

  const controls = container.createDiv({ cls: "task-hub-calendar-controls" });
  for (const mode of ["day", "week", "month"] as CalendarViewMode[]) {
    const button = controls.createEl("button", { cls: state.mode === mode ? "mod-cta" : "", text: state.t(MODE_LABEL_KEYS[mode]) });
    button.addEventListener("click", () => handlers.onModeChange(mode));
  }
  controls.createEl("button", { text: state.t("previous") }).addEventListener("click", () => handlers.onMove(-1));
  controls.createEl("button", { text: state.t("today") }).addEventListener("click", handlers.onToday);
  controls.createEl("button", { text: state.t("next") }).addEventListener("click", () => handlers.onMove(1));

  const layers = container.createDiv({ cls: "task-hub-layer-list" });
  renderLayerButton(layers, "vault", state.t("vaultTasks"), state.visibleSourceIds.has("vault"), handlers);
  for (const source of state.sources) {
    renderLayerButton(
      layers,
      source.id,
      `${source.name} (${sourceStatusLabel(source, state.t)})`,
      state.visibleSourceIds.has(source.id),
      handlers
    );
  }

  const items = buildCalendarItems({
    tasks,
    events,
    visibleSourceIds: state.visibleSourceIds,
    includeCompletedTasks: state.includeCompletedTasks,
    sourceColors: Object.fromEntries(state.sources.map((source) => [source.id, source.color]))
  });
  const range = getCalendarRange(state.mode, state.focusDate, state.weekStart);
  const visibleItems = items.filter((item) => item.date >= range.start && item.date <= range.end);
  const today = toLocalDateKey(new Date());

  if (visibleItems.length === 0) {
    container.createDiv({ cls: "task-hub-empty", text: state.t("calendarEmpty") });
  }

  const grid = container.createDiv({ cls: `task-hub-calendar-grid task-hub-calendar-${state.mode}` });
  for (const day of range.days) {
    const dayItems = visibleItems.filter((candidate) => candidate.date === day);
    const taskCount = dayItems.filter((item) => item.kind === "task").length;
    const eventCount = dayItems.length - taskCount;
    const dayDate = new Date(`${day}T00:00:00`);
    const classes = [
      "task-hub-calendar-day",
      day === today ? "is-today" : "",
      dayItems.length === 0 ? "is-empty" : "has-items"
    ].filter(Boolean).join(" ");
    const cell = grid.createDiv({ cls: classes });
    const header = cell.createDiv({ cls: "task-hub-calendar-date" });
    header.createSpan({ cls: "task-hub-calendar-weekday", text: shortWeekday(dayDate) });
    header.createSpan({ cls: "task-hub-calendar-day-number", text: String(dayDate.getDate()) });
    if (dayItems.length > 0) {
      header.createSpan({ cls: "task-hub-calendar-count", text: itemSummary(taskCount, eventCount, state.t) });
    }

    for (const item of dayItems.slice(0, state.mode === "month" ? 4 : 20)) {
      renderCalendarItem(cell, item, handlers, state.t);
    }
    const hiddenCount = dayItems.length - (state.mode === "month" ? 4 : 20);
    if (hiddenCount > 0) {
      cell.createDiv({ cls: "task-hub-calendar-more", text: `+${hiddenCount} ${state.t("more")}` });
    }
  }
}

function sourceStatusLabel(source: CalendarSource, t: Translator): string {
  if (source.status.state === "ok") return `${source.status.eventCount} ${t("events")}`;
  if (source.status.state === "error") return errorTypeLabel(source.status.errorType, t);
  return t("notSynced");
}

type CalendarErrorType = Extract<CalendarSourceStatus, { state: "error" }>["errorType"];

function errorTypeLabel(errorType: CalendarErrorType, t: Translator): string {
  if (errorType === "network_error") return t("networkError");
  if (errorType === "http_error") return t("httpError");
  if (errorType === "invalid_content") return t("invalidContent");
  return t("parseError");
}

function renderLayerButton(
  container: HTMLElement,
  id: string,
  label: string,
  enabled: boolean,
  handlers: CalendarViewHandlers
): void {
  const button = container.createEl("button", { cls: enabled ? "mod-cta" : "", text: label });
  button.addEventListener("click", () => handlers.onLayerToggle(id));
}

function renderCalendarItem(container: HTMLElement, item: CalendarItem, handlers: CalendarViewHandlers, t: Translator): void {
  const row = container.createDiv({ cls: `task-hub-calendar-item is-${item.kind}` });
  if (item.color) row.style.setProperty("--task-hub-item-color", item.color);
  row.createSpan({ cls: "task-hub-calendar-item-kind", text: item.kind === "task" ? t("task") : t("event") });
  row.createSpan({ cls: "task-hub-calendar-item-title", text: item.title });
  if (item.task) {
    row.addEventListener("click", () => handlers.onTaskJump(item.task as TaskItem));
  }
}

function shortWeekday(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: "short" });
}

function itemSummary(taskCount: number, eventCount: number, t: Translator): string {
  if (taskCount > 0 && eventCount > 0) return `${taskCount} ${t("task")} · ${eventCount} ${t("event")}`;
  if (taskCount > 0) return `${taskCount} ${t("task")}`;
  return `${eventCount} ${t("event")}`;
}
