import { Menu } from "obsidian";
import { buildCalendarItems, calendarEventLayerId, getCalendarRange, type CalendarItem, type CalendarViewMode } from "../calendar/calendarModel";
import { toLocalDateKey } from "../calendar/dateBuckets";
import { formatLunarDayLabel, formatLunarMonthTitle } from "../calendar/lunarCalendar";
import type { TranslationKey, Translator } from "../i18n";
import type { CalendarEvent, CalendarSource, CalendarSourceStatus, TaskItem, WeekStart } from "../types";

export type CalendarViewState = {
  mode: CalendarViewMode;
  focusDate: Date;
  weekStart: WeekStart;
  visibleSourceIds: Set<string>;
  includeCompletedTasks: boolean;
  allowAppleReminderWriteback: boolean;
  allowAppleReminderCreate?: boolean;
  allowAppleCalendarWriteback?: boolean;
  allowAppleCalendarTaskSend?: boolean;
  allowTaskCreation: boolean;
  showLunarCalendar?: boolean;
  today?: Date;
  sources: CalendarSource[];
  t: Translator;
};

export type CalendarViewHandlers = {
  onModeChange: (mode: CalendarViewMode) => void;
  onMove: (direction: -1 | 1) => void;
  onToday: () => void;
  onLayerToggle: (sourceId: string) => void;
  onDateCreateTask: (dateKey: string) => void;
  onTaskComplete: (task: TaskItem) => void;
  onTaskJump: (task: TaskItem) => void;
  onTaskSelect: (task: TaskItem) => void;
  onTaskReschedule: (task: TaskItem, dateKey: string) => void;
  onTaskSendToAppleReminders?: (task: TaskItem) => void;
  onTaskSendToAppleCalendar?: (task: TaskItem) => void;
  onEventReschedule?: (event: CalendarEvent, dateKey: string) => void;
};

const MODE_LABEL_KEYS: Record<CalendarViewMode, TranslationKey> = {
  day: "day",
  week: "week",
  month: "month"
};
const HOUR_HEIGHT = 56;
const DEFAULT_START_HOUR = 6;
const DEFAULT_END_HOUR = 22;
const CALENDAR_ITEM_DRAG_MIME = "application/x-task-hub-calendar-item-id";
const TASK_DRAG_MIME = "application/x-task-hub-task-id";
const WEEK_START_DAY_INDEX: Record<WeekStart, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6
};

export function renderCalendarView(
  container: HTMLElement,
  state: CalendarViewState,
  tasks: TaskItem[],
  events: CalendarEvent[],
  handlers: CalendarViewHandlers
): void {
  container.empty();
  const today = toLocalDateKey(state.today ?? new Date());
  const range = getCalendarRange(state.mode, state.focusDate, state.weekStart);
  const isTodayVisible = today >= range.start && today <= range.end;

  const controls = container.createDiv({ cls: "task-hub-calendar-controls" });
  for (const mode of ["day", "week", "month"] as CalendarViewMode[]) {
    const button = controls.createEl("button", { cls: state.mode === mode ? "mod-cta" : "", text: state.t(MODE_LABEL_KEYS[mode]) });
    button.addEventListener("click", () => handlers.onModeChange(mode));
  }
  const previousButton = controls.createEl("button", { cls: "task-hub-calendar-arrow", text: "‹" });
  previousButton.setAttr("aria-label", state.t("previous"));
  previousButton.addEventListener("click", () => handlers.onMove(-1));
  const todayButton = controls.createEl("button", {
    cls: `task-hub-calendar-today-button ${isTodayVisible ? "is-current-range" : ""}`,
    text: state.t("today")
  });
  todayButton.addEventListener("click", handlers.onToday);
  const nextButton = controls.createEl("button", { cls: "task-hub-calendar-arrow", text: "›" });
  nextButton.setAttr("aria-label", state.t("next"));
  nextButton.addEventListener("click", () => handlers.onMove(1));
  controls.createDiv({ cls: "task-hub-calendar-title", text: calendarTitle(state.focusDate, state.mode, state.t, state.showLunarCalendar) });

  const layers = controls.createEl("details", { cls: "task-hub-layer-menu" });
  const layerSummary = layers.createEl("summary", { text: state.t("layers") });
  layerSummary.createSpan({ cls: "task-hub-layer-count", text: String(state.visibleSourceIds.size) });
  const layerList = layers.createDiv({ cls: "task-hub-layer-list" });
  renderLayerToggle(layerList, "vault", state.t("vaultTasks"), state.visibleSourceIds.has("vault"), handlers);
  for (const source of state.sources) {
    renderLayerToggle(
      layerList,
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
    sourceColors: Object.fromEntries(state.sources.map((source) => [source.id, source.color])),
    eventColors: Object.fromEntries(events.filter((event) => event.sourceId === "apple-calendar" && event.calendarId).map((event) => [event.calendarId as string, appleCalendarEventColor(event, state)]))
  });
  const visibleItems = items.filter((item) => item.date >= range.start && item.date <= range.end);

  if (visibleItems.length === 0) {
    container.createDiv({ cls: "task-hub-empty", text: state.t("calendarEmpty") });
  }

  if (state.mode === "day" || state.mode === "week") {
    renderAgendaGrid(container, state, range.days, visibleItems, handlers, today);
    return;
  }

  renderMonthGrid(container, state, range.days, visibleItems, handlers, today);
}

function renderMonthGrid(
  container: HTMLElement,
  state: CalendarViewState,
  days: string[],
  visibleItems: CalendarItem[],
  handlers: CalendarViewHandlers,
  today: string
): void {
  const leadingPlaceholders = monthLeadingPlaceholderCount(days[0], state.weekStart);
  const grid = container.createDiv({ cls: "task-hub-calendar-grid task-hub-calendar-month" });

  for (let index = 0; index < leadingPlaceholders; index += 1) {
    const placeholder = grid.createDiv({ cls: "task-hub-calendar-day-placeholder" });
    placeholder.setAttr("aria-hidden", "true");
  }
  for (const day of days) {
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
    bindTaskCreation(cell, day, state, handlers);
    bindCalendarDropTarget(cell, day, visibleItems, handlers, state);
    const header = cell.createDiv({ cls: "task-hub-calendar-date" });
    header.createSpan({ cls: "task-hub-calendar-weekday", text: shortWeekday(dayDate) });
    header.createSpan({ cls: "task-hub-calendar-day-number", text: String(dayDate.getDate()) });
    if (state.showLunarCalendar) {
      const lunarDay = formatLunarDayLabel(dayDate);
      if (lunarDay) header.createSpan({ cls: "task-hub-calendar-lunar-day", text: lunarDay });
    }
    if (dayItems.length > 0) {
      header.createSpan({ cls: "task-hub-calendar-count", text: itemSummary(taskCount, eventCount, state.t) });
    }

    const itemArea = cell.createDiv({ cls: "task-hub-calendar-day-items" });
    for (const item of dayItems) {
      renderCalendarItem(itemArea, item, handlers, state);
    }
  }
}

function appleCalendarEventColor(event: CalendarEvent, state: CalendarViewState): string {
  const appleSource = state.sources.find((source) => source.id === calendarEventLayerId(event) || source.id === "apple-calendar");
  return event.calendarColor ?? appleSource?.color ?? "#6f94b8";
}

function monthLeadingPlaceholderCount(firstDay: string, weekStart: WeekStart): number {
  const firstDate = new Date(`${firstDay}T00:00:00`);
  const weekStartIndex = WEEK_START_DAY_INDEX[weekStart];
  return (firstDate.getDay() - weekStartIndex + 7) % 7;
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
    renderAgendaDayHeader(agenda, day, visibleItems.filter((item) => item.date === day), day === today, state, handlers);
  }

  const allDayLabel = agenda.createDiv({ cls: "task-hub-agenda-all-day-label", text: state.t("allDay") });
  allDayLabel.setAttr("aria-hidden", "true");
  for (const day of days) {
    const allDayItems = visibleItems.filter((item) => item.date === day && (item.allDay || item.startMinutes === undefined));
    const slot = agenda.createDiv({ cls: "task-hub-agenda-all-day-slot" });
    bindTaskCreation(slot, day, state, handlers);
    bindCalendarDropTarget(slot, day, visibleItems, handlers, state);
    for (const item of allDayItems) {
      renderCalendarItem(slot, item, handlers, state);
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
    bindTaskCreation(column, day, state, handlers);
    bindCalendarDropTarget(column, day, visibleItems, handlers, state);
    const dayTimedItems = timedItems.filter((item) => item.date === day);
    for (const item of dayTimedItems) {
      renderTimedCalendarItem(column, item, startHour, handlers, state);
    }
  }
}

function renderAgendaDayHeader(
  container: HTMLElement,
  day: string,
  dayItems: CalendarItem[],
  isToday: boolean,
  state: CalendarViewState,
  handlers: CalendarViewHandlers
): void {
  const dayDate = new Date(`${day}T00:00:00`);
  const taskCount = dayItems.filter((item) => item.kind === "task").length;
  const eventCount = dayItems.length - taskCount;
  const header = container.createDiv({ cls: `task-hub-agenda-day-header ${isToday ? "is-today" : ""}` });
  bindTaskCreation(header, day, state, handlers);
  bindCalendarDropTarget(header, day, dayItems, handlers, state);
  header.createSpan({ cls: "task-hub-calendar-weekday", text: shortWeekday(dayDate) });
  header.createSpan({ cls: "task-hub-calendar-day-number", text: String(dayDate.getDate()) });
  if (dayItems.length > 0) {
    header.createSpan({ cls: "task-hub-calendar-count", text: itemSummary(taskCount, eventCount, state.t) });
  }
}

function renderTimedCalendarItem(
  container: HTMLElement,
  item: CalendarItem,
  startHour: number,
  handlers: CalendarViewHandlers,
  state: CalendarViewState
): void {
  const row = container.createDiv({ cls: calendarItemClass(item, "task-hub-calendar-timed-item") });
  bindCalendarItemDrag(row, item, state);
  bindCalendarItemContextMenu(row, item, state, handlers);
  if (item.color) row.style.setProperty("--task-hub-item-color", item.color);
  const startMinutes = item.startMinutes ?? startHour * 60;
  const endMinutes = Math.max(item.endMinutes ?? startMinutes + 60, startMinutes + 30);
  row.style.top = `${((startMinutes - startHour * 60) / 60) * HOUR_HEIGHT}px`;
  row.style.height = `${Math.max(30, ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT - 4)}px`;
  renderCalendarItemContent(row, item, handlers, state, formatTimeRange(startMinutes, endMinutes));
  const task = item.task;
  if (task) {
    row.addEventListener("click", (event) => {
      event.stopPropagation();
      handlers.onTaskSelect(task);
    });
  } else {
    row.addEventListener("click", (event) => {
      event.stopPropagation();
    });
  }
}

function bindTaskCreation(
  element: HTMLElement,
  dateKey: string,
  state: CalendarViewState,
  handlers: CalendarViewHandlers
): void {
  if (!state.allowTaskCreation) return;
  element.addEventListener("click", () => handlers.onDateCreateTask(dateKey));
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

function renderLayerToggle(
  container: HTMLElement,
  id: string,
  label: string,
  enabled: boolean,
  handlers: CalendarViewHandlers
): void {
  const row = container.createEl("label", { cls: "task-hub-layer-option" });
  const checkbox = row.createEl("input", { type: "checkbox" });
  checkbox.checked = enabled;
  checkbox.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  checkbox.addEventListener("change", () => handlers.onLayerToggle(id));
  row.createSpan({ text: label });
}

function renderCalendarItem(container: HTMLElement, item: CalendarItem, handlers: CalendarViewHandlers, state: CalendarViewState): void {
  const row = container.createDiv({ cls: calendarItemClass(item) });
  bindCalendarItemDrag(row, item, state);
  bindCalendarItemContextMenu(row, item, state, handlers);
  if (item.color) row.style.setProperty("--task-hub-item-color", item.color);
  renderCalendarItemContent(row, item, handlers, state);
  const task = item.task;
  if (task) {
    row.addEventListener("click", (event) => {
      event.stopPropagation();
      handlers.onTaskSelect(task);
    });
  } else {
    row.addEventListener("click", (event) => {
      event.stopPropagation();
    });
  }
}

function bindCalendarItemContextMenu(
  element: HTMLElement,
  item: CalendarItem,
  state: CalendarViewState,
  handlers: CalendarViewHandlers
): void {
  if (item.task?.source !== "vault") return;

  element.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const menu = new Menu();
    if (canSendTaskToAppleCalendar(item, state)) {
      menu.addItem((menuItem) => {
        menuItem
          .setTitle(state.t("sendToAppleCalendar"))
          .setIcon("calendar-plus")
          .onClick(() => {
            const task = item.task;
            if (task) handlers.onTaskSendToAppleCalendar?.(task);
          });
      });
    }
    if (canSendTaskToAppleReminders(item, state)) {
      menu.addItem((menuItem) => {
        menuItem
          .setTitle(state.t("sendToAppleReminders"))
          .setIcon("bell-plus")
          .onClick(() => {
            const task = item.task;
            if (task) handlers.onTaskSendToAppleReminders?.(task);
          });
      });
    }
    if (!canSendTaskToAppleCalendar(item, state) && !canSendTaskToAppleReminders(item, state)) {
      menu.addItem((menuItem) => {
        menuItem
          .setTitle(state.t("sendToAppleCalendarDisabled"))
          .setIcon("calendar-x")
          .onClick(() => undefined);
      });
    }
    menu.showAtMouseEvent(event);
  });
}

function bindCalendarItemDrag(element: HTMLElement, item: CalendarItem, state: CalendarViewState): void {
  if (!canDragCalendarItem(item, state)) return;

  element.draggable = true;
  element.setAttr("draggable", "true");
  element.setAttr("aria-grabbed", "false");
  element.addEventListener("dragstart", (event) => {
    event.stopPropagation();
    element.addClass("is-dragging");
    element.setAttr("aria-grabbed", "true");
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData(CALENDAR_ITEM_DRAG_MIME, item.id);
      if (item.kind === "task") {
        event.dataTransfer.setData(TASK_DRAG_MIME, item.id);
      }
    }
  });
  element.addEventListener("dragend", () => {
    element.removeClass("is-dragging");
    element.setAttr("aria-grabbed", "false");
  });
}

function bindCalendarDropTarget(
  element: HTMLElement,
  dateKey: string,
  visibleItems: CalendarItem[],
  handlers: CalendarViewHandlers,
  state: CalendarViewState
): void {
  element.addEventListener("dragover", (event) => {
    if (!isTaskHubDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    element.addClass("is-drop-hover");
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
  });
  element.addEventListener("dragleave", () => {
    element.removeClass("is-drop-hover");
  });
  element.addEventListener("drop", (event) => {
    const item = calendarItemFromDragEvent(event, visibleItems, state);
    if (!item) return;
    event.preventDefault();
    event.stopPropagation();
    element.removeClass("is-drop-hover");
    if (item.task) {
      handlers.onTaskReschedule(item.task, dateKey);
      return;
    }
    if (item.event) {
      handlers.onEventReschedule?.(item.event, dateKey);
    }
  });
}

function calendarItemFromDragEvent(event: DragEvent, visibleItems: CalendarItem[], state: CalendarViewState): CalendarItem | undefined {
  const draggedId = event.dataTransfer?.getData(CALENDAR_ITEM_DRAG_MIME) || event.dataTransfer?.getData(TASK_DRAG_MIME);
  if (!draggedId) return undefined;
  return visibleItems.find((item) => item.id === draggedId && canDragCalendarItem(item, state));
}

function isTaskHubDrag(event: DragEvent): boolean {
  const types = Array.from(event.dataTransfer?.types ?? []);
  return types.includes(CALENDAR_ITEM_DRAG_MIME) || types.includes(TASK_DRAG_MIME);
}

function canDragCalendarItem(item: CalendarItem, state: CalendarViewState): boolean {
  if (item.kind === "event") {
    return item.event?.sourceId === "apple-calendar" && Boolean(state.allowAppleCalendarWriteback) && Boolean(item.event.id);
  }
  if (item.task?.source === "vault") return true;
  return item.task?.source === "apple-reminders" && state.allowAppleReminderWriteback && Boolean(item.task.externalId);
}

function canSendTaskToAppleCalendar(item: CalendarItem, state: CalendarViewState): boolean {
  return Boolean(state.allowAppleCalendarTaskSend && item.task?.source === "vault" && item.task.dueDate);
}

function canSendTaskToAppleReminders(item: CalendarItem, state: CalendarViewState): boolean {
  return Boolean(state.allowAppleReminderCreate && item.task?.source === "vault");
}

function calendarItemClass(item: CalendarItem, extraClass = ""): string {
  return [
    "task-hub-calendar-item",
    `is-${item.kind}`,
    item.kind === "task" && item.task?.completed ? "is-completed" : "",
    item.isMultiDay ? "is-multi-day" : "",
    item.isMultiDayStart ? "is-multi-day-start" : "",
    item.isMultiDayEnd ? "is-multi-day-end" : "",
    extraClass
  ]
    .filter(Boolean)
    .join(" ");
}

function renderCalendarItemContent(
  row: HTMLElement,
  item: CalendarItem,
  handlers: CalendarViewHandlers,
  state: CalendarViewState,
  timeLabel?: string
): void {
  const task = item.task;
  if (task) {
    row.addClass("has-checkbox");
    const checkbox = row.createEl("input", { type: "checkbox" });
    checkbox.checked = task.completed;
    checkbox.disabled = !canToggleCalendarTask(task, state);
    checkbox.addEventListener("click", (event) => {
      event.stopPropagation();
      handlers.onTaskComplete(task);
    });
  }
  const body = row.createDiv({ cls: "task-hub-calendar-item-body" });
  if (timeLabel) body.createSpan({ cls: "task-hub-calendar-item-time", text: timeLabel });
  body.createSpan({ cls: "task-hub-calendar-item-title", text: item.title });
}

function canToggleCalendarTask(task: TaskItem, state: CalendarViewState): boolean {
  return task.source === "vault" || (task.source === "apple-reminders" && state.allowAppleReminderWriteback);
}

function shortWeekday(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: "short" });
}

function calendarTitle(date: Date, mode: CalendarViewMode, t: Translator, showLunarCalendar?: boolean): string {
  const locale = t("language") === "语言" ? "zh-CN" : "en-US";
  if (mode === "day") {
    return date.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
  }
  const solarTitle = date.toLocaleDateString(locale, { year: "numeric", month: "long" });
  if (mode !== "month" || !showLunarCalendar) return solarTitle;
  const lunarTitle = formatLunarMonthTitle(date);
  return lunarTitle ? `${solarTitle} · ${lunarTitle}` : solarTitle;
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
