import { toLocalDateKey } from "./dateBuckets";
import type { CalendarEvent, TaskItem, WeekStart } from "../types";

export type CalendarViewMode = "day" | "week" | "month";

export type CalendarItem = {
  id: string;
  title: string;
  date: string;
  endDate?: string;
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

export function buildCalendarItems(input: BuildCalendarItemsInput): CalendarItem[] {
  const items: CalendarItem[] = [];

  if (input.visibleSourceIds.has("vault")) {
    for (const task of input.tasks) {
      if (!task.dueDate) continue;
      if (task.completed && !input.includeCompletedTasks) continue;
      items.push({
        id: `task:${task.id}`,
        title: task.text,
        date: task.dueDate,
        allDay: true,
        sourceId: "vault",
        kind: "task",
        color: input.sourceColors?.vault,
        task
      });
    }
  }

  for (const event of input.events) {
    if (!input.visibleSourceIds.has(event.sourceId)) continue;
    items.push({
      id: `event:${event.sourceId}:${event.id}`,
      title: event.title,
      date: event.start.slice(0, 10),
      endDate: event.end?.slice(0, 10),
      allDay: event.allDay,
      sourceId: event.sourceId,
      kind: "event",
      color: input.sourceColors?.[event.sourceId],
      event
    });
  }

  return items.sort((left, right) => left.date.localeCompare(right.date) || left.title.localeCompare(right.title));
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
  const desiredStart = weekStart === "monday" ? 1 : 0;
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
