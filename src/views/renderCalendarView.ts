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
const HOUR_HEIGHT = 56;
const DEFAULT_START_HOUR = 6;
const DEFAULT_END_HOUR = 22;

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

  if (state.mode === "day" || state.mode === "week") {
    renderAgendaGrid(container, state, range.days, visibleItems, handlers, today);
    return;
  }

  const grid = container.createDiv({ cls: "task-hub-calendar-grid task-hub-calendar-month" });
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

function renderAgendaGrid(
  container: HTMLElement,
  state: CalendarViewState,
  days: string[],
  visibleItems: CalendarItem[],
  handlers: CalendarViewHandlers,
  today: string
): void {
  const timedItems = visibleItems.filter((item) => !item.allDay && item.startMinutes !== undefined);
  const startHour = Math.min(DEFAULT_START_HOUR, ...timedItems.map((item) => Math.floor((item.startMinutes ?? 0) / 60)));
  const endHour = Math.max(
    DEFAULT_END_HOUR,
    ...timedItems.map((item) => Math.ceil(((item.endMinutes ?? (item.startMinutes ?? 0) + 60) || 60) / 60))
  );
  const hourCount = Math.max(1, endHour - startHour);
  const agenda = container.createDiv({ cls: `task-hub-agenda task-hub-agenda-${state.mode}` });
  agenda.style.setProperty("--task-hub-agenda-days", String(days.length));
  agenda.style.setProperty("--task-hub-agenda-hours", String(hourCount));
  agenda.style.setProperty("--task-hub-hour-height", `${HOUR_HEIGHT}px`);

  const corner = agenda.createDiv({ cls: "task-hub-agenda-corner" });
  corner.createSpan({ text: state.t("today") });

  for (const day of days) {
    renderAgendaDayHeader(agenda, day, visibleItems.filter((item) => item.date === day), day === today, state.t);
  }

  const allDayLabel = agenda.createDiv({ cls: "task-hub-agenda-all-day-label", text: state.t("allDay") });
  allDayLabel.setAttr("aria-hidden", "true");
  for (const day of days) {
    const allDayItems = visibleItems.filter((item) => item.date === day && (item.allDay || item.startMinutes === undefined));
    const slot = agenda.createDiv({ cls: "task-hub-agenda-all-day-slot" });
    for (const item of allDayItems.slice(0, 3)) {
      renderCalendarItem(slot, item, handlers, state.t);
    }
    if (allDayItems.length > 3) {
      slot.createDiv({ cls: "task-hub-calendar-more", text: `+${allDayItems.length - 3} ${state.t("more")}` });
    }
  }

  const timeAxis = agenda.createDiv({ cls: "task-hub-agenda-time-axis" });
  for (let hour = startHour; hour <= endHour; hour += 1) {
    timeAxis.createDiv({ cls: "task-hub-agenda-time-label", text: formatHour(hour) });
  }

  const grid = agenda.createDiv({ cls: "task-hub-agenda-time-grid" });
  grid.style.setProperty("--task-hub-agenda-rows", String(hourCount));
  for (let index = 0; index < hourCount; index += 1) {
    grid.createDiv({ cls: "task-hub-agenda-hour-line" });
  }

  const columns = agenda.createDiv({ cls: "task-hub-agenda-columns" });
  for (const day of days) {
    const column = columns.createDiv({ cls: `task-hub-agenda-column ${day === today ? "is-today" : ""}` });
    const dayTimedItems = timedItems.filter((item) => item.date === day);
    for (const item of dayTimedItems) {
      renderTimedCalendarItem(column, item, startHour, handlers, state.t);
    }
  }
}

function renderAgendaDayHeader(container: HTMLElement, day: string, dayItems: CalendarItem[], isToday: boolean, t: Translator): void {
  const dayDate = new Date(`${day}T00:00:00`);
  const taskCount = dayItems.filter((item) => item.kind === "task").length;
  const eventCount = dayItems.length - taskCount;
  const header = container.createDiv({ cls: `task-hub-agenda-day-header ${isToday ? "is-today" : ""}` });
  header.createSpan({ cls: "task-hub-calendar-weekday", text: shortWeekday(dayDate) });
  header.createSpan({ cls: "task-hub-calendar-day-number", text: String(dayDate.getDate()) });
  if (dayItems.length > 0) {
    header.createSpan({ cls: "task-hub-calendar-count", text: itemSummary(taskCount, eventCount, t) });
  }
}

function renderTimedCalendarItem(
  container: HTMLElement,
  item: CalendarItem,
  startHour: number,
  handlers: CalendarViewHandlers,
  t: Translator
): void {
  const row = container.createDiv({ cls: `task-hub-calendar-item task-hub-calendar-timed-item is-${item.kind}` });
  if (item.color) row.style.setProperty("--task-hub-item-color", item.color);
  const startMinutes = item.startMinutes ?? startHour * 60;
  const endMinutes = Math.max(item.endMinutes ?? startMinutes + 60, startMinutes + 30);
  row.style.top = `${((startMinutes - startHour * 60) / 60) * HOUR_HEIGHT}px`;
  row.style.height = `${Math.max(30, ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT - 4)}px`;
  row.createSpan({ cls: "task-hub-calendar-item-kind", text: formatTimeRange(startMinutes, endMinutes) });
  row.createSpan({ cls: "task-hub-calendar-item-title", text: item.title });
  if (item.task) {
    row.addEventListener("click", () => handlers.onTaskJump(item.task as TaskItem));
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
  if (errorType === "local_error") return t("localAppleError");
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

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function formatTimeRange(startMinutes: number, endMinutes: number): string {
  return `${formatMinutes(startMinutes)}-${formatMinutes(endMinutes)}`;
}

function formatMinutes(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
