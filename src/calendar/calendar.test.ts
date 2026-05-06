import { buildCalendarItems, getCalendarRange } from "./calendarModel";
import type { CalendarEvent, TaskItem } from "../types";

const TASKS: TaskItem[] = [
  task({ id: "task-1", text: "Due today", dueDate: "2026-05-06" }),
  task({ id: "task-2", text: "Done today", completed: true, dueDate: "2026-05-06" }),
  task({ id: "task-3", text: "No date" })
];

const EVENTS: CalendarEvent[] = [
  {
    id: "event-1",
    sourceId: "holidays",
    title: "Holiday",
    start: "2026-05-06",
    allDay: true
  }
];

const TIMED_EVENTS: CalendarEvent[] = [
  {
    id: "event-2",
    sourceId: "work",
    title: "Design review",
    start: "2026-05-06T09:30:00",
    end: "2026-05-06T10:45:00",
    allDay: false
  }
];

describe("buildCalendarItems", () => {
  it("converts dated open tasks to all-day calendar items", () => {
    const items = buildCalendarItems({
      tasks: TASKS,
      events: [],
      visibleSourceIds: new Set(["vault"]),
      includeCompletedTasks: false
    });

    expect(items).toEqual([
      expect.objectContaining({
        id: "task:task-1",
        title: "Due today",
        date: "2026-05-06",
        kind: "task",
        allDay: true
      })
    ]);
  });

  it("honors completed-task and source layer visibility", () => {
    const items = buildCalendarItems({
      tasks: TASKS,
      events: EVENTS,
      visibleSourceIds: new Set(["vault", "holidays"]),
      includeCompletedTasks: true
    });

    expect(new Set(items.map((item) => item.id))).toEqual(
      new Set(["event:holidays:event-1", "task:task-1", "task:task-2"])
    );
  });

  it("filters hidden external sources", () => {
    const items = buildCalendarItems({
      tasks: TASKS,
      events: EVENTS,
      visibleSourceIds: new Set(["vault"]),
      includeCompletedTasks: false
    });

    expect(items.map((item) => item.kind)).toEqual(["task"]);
  });

  it("keeps timed external events positioned by minutes from midnight", () => {
    const items = buildCalendarItems({
      tasks: [],
      events: TIMED_EVENTS,
      visibleSourceIds: new Set(["work"]),
      includeCompletedTasks: false
    });

    expect(items).toEqual([
      expect.objectContaining({
        id: "event:work:event-2",
        date: "2026-05-06",
        startMinutes: 570,
        endMinutes: 645,
        allDay: false
      })
    ]);
  });
});

describe("getCalendarRange", () => {
  it("returns day, week, and month ranges", () => {
    expect(getCalendarRange("day", new Date("2026-05-06T09:00:00"), "monday")).toMatchObject({
      start: "2026-05-06",
      end: "2026-05-06"
    });
    expect(getCalendarRange("week", new Date("2026-05-06T09:00:00"), "monday")).toMatchObject({
      start: "2026-05-04",
      end: "2026-05-10"
    });
    expect(getCalendarRange("month", new Date("2026-05-06T09:00:00"), "monday")).toMatchObject({
      start: "2026-05-01",
      end: "2026-05-31"
    });
  });
});

function task(overrides: Partial<TaskItem>): TaskItem {
  return {
    id: overrides.id ?? "task",
    filePath: "Inbox.md",
    line: 0,
    rawLine: "- [ ] Task",
    text: overrides.text ?? "Task",
    completed: overrides.completed ?? false,
    tags: [],
    dueDate: overrides.dueDate,
    source: "vault"
  };
}
