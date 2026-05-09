import { renderCalendarView } from "./renderCalendarView";
import type { CalendarEvent, CalendarSource, TaskItem } from "../types";

class FakeElement {
  children: FakeElement[] = [];
  checked = false;
  disabled = false;
  text = "";
  type = "";
  classes = new Set<string>();
  style = { setProperty: jest.fn() };
  listeners = new Map<string, Array<(event: { stopPropagation(): void }) => void>>();

  empty(): void {
    this.children = [];
  }

  createDiv(options: { cls?: string; text?: string } = {}): FakeElement {
    return this.append(options);
  }

  createEl(tag: string, options: { cls?: string; type?: string; text?: string } = {}): FakeElement {
    const child = this.append(options);
    child.type = options.type ?? tag;
    return child;
  }

  createSpan(options: { cls?: string; text?: string } = {}): FakeElement {
    return this.append(options);
  }

  addClass(cls: string): void {
    this.classes.add(cls);
  }

  setAttr(): void {}

  addEventListener(name: string, listener: (event: { stopPropagation(): void }) => void): void {
    this.listeners.set(name, [...(this.listeners.get(name) ?? []), listener]);
  }

  private append(options: { cls?: string; text?: string } = {}): FakeElement {
    const child = new FakeElement();
    child.text = options.text ?? "";
    for (const cls of (options.cls ?? "").split(" ").filter(Boolean)) {
      child.classes.add(cls);
    }
    this.children.push(child);
    return child;
  }
}

const task: TaskItem = {
  id: "task-1",
  filePath: "Inbox.md",
  line: 0,
  rawLine: "- [ ] Task",
  text: "Task",
  completed: false,
  tags: [],
  dueDate: "2026-05-08",
  source: "vault"
};

const event: CalendarEvent = {
  id: "event-1",
  sourceId: "apple-calendar",
  title: "Event",
  start: "2026-05-08",
  allDay: true
};

const source: CalendarSource = {
  id: "apple-calendar",
  name: "Apple Calendar",
  type: "apple-calendar",
  url: "local://apple-calendar",
  color: "#ef4444",
  enabled: true,
  refreshIntervalMinutes: 0,
  status: { state: "ok", lastSyncedAt: "2026-05-08T00:00:00.000Z", eventCount: 1 }
};

function collect(element: FakeElement): FakeElement[] {
  return [element, ...element.children.flatMap(collect)];
}

describe("renderCalendarView", () => {
  it("renders calendar tasks with checkboxes and without task/event kind labels", () => {
    const container = new FakeElement();

    renderCalendarView(
      container as unknown as HTMLElement,
      {
        mode: "month",
        focusDate: new Date("2026-05-08T12:00:00Z"),
        weekStart: "monday",
        visibleSourceIds: new Set(["vault", "apple-calendar"]),
        includeCompletedTasks: false,
        allowAppleReminderWriteback: false,
        sources: [source],
        t: (key) => key
      },
      [task],
      [event],
      {
        onLayerToggle: jest.fn(),
        onModeChange: jest.fn(),
        onMove: jest.fn(),
        onTaskComplete: jest.fn(),
        onTaskJump: jest.fn(),
        onToday: jest.fn()
      }
    );

    const elements = collect(container);
    expect(elements.some((element) => element.type === "checkbox")).toBe(true);
    expect(elements.some((element) => element.classes.has("task-hub-calendar-item-kind"))).toBe(false);
    expect(elements.map((element) => element.text)).not.toContain("task");
    expect(elements.map((element) => element.text)).not.toContain("event");
  });

  it("marks completed calendar tasks for completed styling", () => {
    const container = new FakeElement();

    renderCalendarView(
      container as unknown as HTMLElement,
      {
        mode: "month",
        focusDate: new Date("2026-05-08T12:00:00Z"),
        weekStart: "monday",
        visibleSourceIds: new Set(["vault"]),
        includeCompletedTasks: true,
        allowAppleReminderWriteback: false,
        sources: [],
        t: (key) => key
      },
      [{ ...task, completed: true }],
      [],
      {
        onLayerToggle: jest.fn(),
        onModeChange: jest.fn(),
        onMove: jest.fn(),
        onTaskComplete: jest.fn(),
        onTaskJump: jest.fn(),
        onToday: jest.fn()
      }
    );

    const elements = collect(container);
    expect(elements.some((element) => element.classes.has("task-hub-calendar-item") && element.classes.has("is-completed"))).toBe(true);
  });
});
