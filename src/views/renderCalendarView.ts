import { buildCalendarItems, getCalendarRange, type CalendarItem, type CalendarViewMode } from "../calendar/calendarModel";
import type { Translator } from "../i18n";
import type { CalendarEvent, CalendarSource, TaskItem, WeekStart } from "../types";

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
    const button = controls.createEl("button", { cls: state.mode === mode ? "mod-cta" : "", text: mode });
    button.addEventListener("click", () => handlers.onModeChange(mode));
  }
  controls.createEl("button", { text: "Prev" }).addEventListener("click", () => handlers.onMove(-1));
  controls.createEl("button", { text: state.t("today") }).addEventListener("click", handlers.onToday);
  controls.createEl("button", { text: "Next" }).addEventListener("click", () => handlers.onMove(1));

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

  if (visibleItems.length === 0) {
    container.createDiv({ cls: "task-hub-empty", text: state.t("calendarEmpty") });
  }

  const grid = container.createDiv({ cls: `task-hub-calendar-grid task-hub-calendar-${state.mode}` });
  for (const day of range.days) {
    const cell = grid.createDiv({ cls: "task-hub-calendar-day" });
    cell.createDiv({ cls: "task-hub-calendar-date", text: day });
    for (const item of visibleItems.filter((candidate) => candidate.date === day).slice(0, state.mode === "month" ? 4 : 20)) {
      renderCalendarItem(cell, item, handlers, state.t);
    }
    const hiddenCount = visibleItems.filter((candidate) => candidate.date === day).length - (state.mode === "month" ? 4 : 20);
    if (hiddenCount > 0) {
      cell.createDiv({ cls: "task-hub-calendar-more", text: `+${hiddenCount} more` });
    }
  }
}

function sourceStatusLabel(source: CalendarSource, t: Translator): string {
  if (source.status.state === "ok") return `${source.status.eventCount} ${t("event")}`;
  if (source.status.state === "error") return source.status.errorType;
  return t("notSynced");
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
  row.createSpan({ text: item.kind === "task" ? t("task") : t("event") });
  row.createSpan({ text: item.title });
  if (item.task) {
    row.addEventListener("click", () => handlers.onTaskJump(item.task as TaskItem));
  }
}
