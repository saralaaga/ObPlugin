import { toLocalDateKey } from "./dateBuckets";
import type { CalendarEvent, TaskItem, WeekStart } from "../types";

export type CalendarViewMode = "day" | "week" | "month";

export type CalendarItem = {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  startMinutes?: number;
  endMinutes?: number;
  allDay: boolean;
  sourceId: string;
  kind: "task" | "event";
  color?: string;
  task?: TaskItem;
  event?: CalendarEvent;
};

export type BuildCalendarItemsInput = {
  tasks: TaskItem[];
  events: CalendarEvent[];
  visibleSourceIds: Set<string>;
  includeCompletedTasks: boolean;
  sourceColors?: Record<string, string>;
};

export type CalendarRange = {
  start: string;
  end: string;
  days: string[];
};

const WEEK_START_DAY_INDEX: Record<WeekStart, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6
};

export function buildCalendarItems(input: BuildCalendarItemsInput): CalendarItem[] {
  const items: CalendarItem[] = [];

  for (const task of input.tasks) {
    const sourceId = task.source;
    if (!input.visibleSourceIds.has(sourceId)) continue;
    if (!task.dueDate) continue;
    if (task.completed && !input.includeCompletedTasks) continue;
    items.push({
      id: `task:${task.id}`,
      title: task.text,
      date: task.dueDate,
      allDay: true,
      sourceId,
      kind: "task",
      color: input.sourceColors?.[sourceId],
      task
    });
  }

  for (const event of input.events) {
    if (!input.visibleSourceIds.has(event.sourceId)) continue;
    const timing = eventTiming(event);
    items.push({
      id: `event:${event.sourceId}:${event.id}`,
      title: event.title,
      date: timing.date,
      endDate: timing.endDate,
      startMinutes: timing.startMinutes,
      endMinutes: timing.endMinutes,
      allDay: event.allDay || timing.startMinutes === undefined,
      sourceId: event.sourceId,
      kind: "event",
      color: input.sourceColors?.[event.sourceId],
      event
    });
  }

  return items.sort(
    (left, right) =>
      left.date.localeCompare(right.date) ||
      Number(right.allDay) - Number(left.allDay) ||
      (left.startMinutes ?? -1) - (right.startMinutes ?? -1) ||
      calendarCompletionRank(left) - calendarCompletionRank(right) ||
      left.title.localeCompare(right.title)
  );
}

function calendarCompletionRank(item: CalendarItem): number {
  return item.kind === "task" && item.task?.completed ? 1 : 0;
}

function eventTiming(event: CalendarEvent): Pick<CalendarItem, "date" | "endDate" | "startMinutes" | "endMinutes"> {
  const start = parseCalendarDateTime(event.start);
  const end = parseCalendarDateTime(event.end);
  return {
    date: start?.date ?? event.start.slice(0, 10),
    endDate: end?.date,
    startMinutes: event.allDay ? undefined : start?.minutes,
    endMinutes: event.allDay ? undefined : end?.minutes
  };
}

function parseCalendarDateTime(value: string | undefined): { date: string; minutes?: number } | undefined {
  if (!value) return undefined;

  const hasExplicitZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value);
  if (hasExplicitZone) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return {
        date: toLocalDateKey(date),
        minutes: date.getHours() * 60 + date.getMinutes()
      };
    }
  }

  const match = value.match(/^(\d{4}-\d{2}-\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!match) return undefined;
  return {
    date: match[1],
    minutes: match[2] && match[3] ? Number(match[2]) * 60 + Number(match[3]) : undefined
  };
}

export function getCalendarRange(mode: CalendarViewMode, focusDate: Date, weekStart: WeekStart): CalendarRange {
  if (mode === "day") {
    const day = toLocalDateKey(focusDate);
    return { start: day, end: day, days: [day] };
  }

  if (mode === "week") {
    const start = startOfWeek(focusDate, weekStart);
    const days = enumerateDays(start, 7);
    return { start: days[0], end: days[days.length - 1], days };
  }

  const monthStart = new Date(focusDate.getFullYear(), focusDate.getMonth(), 1);
  const monthEnd = new Date(focusDate.getFullYear(), focusDate.getMonth() + 1, 0);
  const days = enumerateDateRange(monthStart, monthEnd);
  return { start: days[0], end: days[days.length - 1], days };
}

function startOfWeek(date: Date, weekStart: WeekStart): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const desiredStart = WEEK_START_DAY_INDEX[weekStart];
  const diff = (start.getDay() - desiredStart + 7) % 7;
  start.setDate(start.getDate() - diff);
  return start;
}

function enumerateDateRange(start: Date, end: Date): string[] {
  const days: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(toLocalDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function enumerateDays(start: Date, count: number): string[] {
  const days: string[] = [];
  const cursor = new Date(start);
  for (let index = 0; index < count; index += 1) {
    days.push(toLocalDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}
