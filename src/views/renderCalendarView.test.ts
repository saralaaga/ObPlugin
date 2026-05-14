import { renderCalendarView } from "./renderCalendarView";
import type { CalendarEvent, CalendarSource, TaskItem } from "../types";

class FakeElement {
  parent?: FakeElement;
  children: FakeElement[] = [];
  checked = false;
  disabled = false;
  draggable = false;
  text = "";
  type = "";
  attributes = new Map<string, string>();
  classes = new Set<string>();
  style = { setProperty: jest.fn() };
  listeners = new Map<string, Array<(event: FakeEvent) => void>>();

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

  removeClass(cls: string): void {
    this.classes.delete(cls);
  }

  setAttr(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  addEventListener(name: string, listener: (event: FakeEvent) => void): void {
    this.listeners.set(name, [...(this.listeners.get(name) ?? []), listener]);
  }

  click(): void {
    let stopped = false;
    const event = {
      dataTransfer: new FakeDataTransfer(),
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(() => { stopped = true; })
    };
    for (const listener of this.listeners.get("click") ?? []) {
      listener(event);
    }
    if (!stopped) {
      this.parent?.click();
    }
  }

  dispatch(name: string, event: Partial<FakeEvent> = {}): FakeEvent {
    const fakeEvent: FakeEvent = {
      dataTransfer: event.dataTransfer ?? new FakeDataTransfer(),
      preventDefault: event.preventDefault ?? jest.fn(),
      stopPropagation: event.stopPropagation ?? jest.fn()
    };
    for (const listener of this.listeners.get(name) ?? []) {
      listener(fakeEvent);
    }
    return fakeEvent;
  }

  private append(options: { cls?: string; text?: string } = {}): FakeElement {
    const child = new FakeElement();
    child.parent = this;
    child.text = options.text ?? "";
    for (const cls of (options.cls ?? "").split(" ").filter(Boolean)) {
      child.classes.add(cls);
    }
    this.children.push(child);
    return child;
  }
}

type FakeEvent = {
  dataTransfer: FakeDataTransfer;
  preventDefault(): void;
  stopPropagation(): void;
};

class FakeDataTransfer {
  effectAllowed = "";
  dropEffect = "";
  hideData = false;
  private values = new Map<string, string>();

  setData(type: string, value: string): void {
    this.values.set(type, value);
  }

  getData(type: string): string {
    if (this.hideData) return "";
    return this.values.get(type) ?? "";
  }

  get types(): string[] {
    return Array.from(this.values.keys());
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

const remindersSource: CalendarSource = {
  id: "apple-reminders",
  name: "Apple Reminders",
  type: "apple-reminders",
  url: "local://apple-reminders",
  color: "#22c55e",
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
        allowTaskCreation: false,
        sources: [source],
        t: (key) => key
      },
      [task],
      [event],
      {
        onLayerToggle: jest.fn(),
        onModeChange: jest.fn(),
        onMove: jest.fn(),
        onDateCreateTask: jest.fn(),
        onTaskComplete: jest.fn(),
        onTaskJump: jest.fn(),
        onTaskReschedule: jest.fn(),
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
        allowTaskCreation: false,
        sources: [],
        t: (key) => key
      },
      [{ ...task, completed: true }],
      [],
      {
        onLayerToggle: jest.fn(),
        onModeChange: jest.fn(),
        onMove: jest.fn(),
        onDateCreateTask: jest.fn(),
        onTaskComplete: jest.fn(),
        onTaskJump: jest.fn(),
        onTaskReschedule: jest.fn(),
        onToday: jest.fn()
      }
    );

    const elements = collect(container);
    expect(elements.some((element) => element.classes.has("task-hub-calendar-item") && element.classes.has("is-completed"))).toBe(true);
  });

  it("uses Apple Reminders source color for calendar task items", () => {
    const container = new FakeElement();

    renderCalendarView(
      container as unknown as HTMLElement,
      {
        mode: "month",
        focusDate: new Date("2026-05-08T12:00:00Z"),
        weekStart: "monday",
        visibleSourceIds: new Set(["apple-reminders"]),
        includeCompletedTasks: false,
        allowAppleReminderWriteback: true,
        allowTaskCreation: false,
        sources: [remindersSource],
        t: (key) => key
      },
      [{ ...task, source: "apple-reminders" }],
      [],
      {
        onLayerToggle: jest.fn(),
        onModeChange: jest.fn(),
        onMove: jest.fn(),
        onDateCreateTask: jest.fn(),
        onTaskComplete: jest.fn(),
        onTaskJump: jest.fn(),
        onTaskReschedule: jest.fn(),
        onToday: jest.fn()
      }
    );

    const item = collect(container).find((element) => element.classes.has("task-hub-calendar-item"));
    expect(item?.style.setProperty).toHaveBeenCalledWith("--task-hub-item-color", "#22c55e");
  });

  it("creates a task for a month day when calendar task creation is enabled", () => {
    const container = new FakeElement();
    const onDateCreateTask = jest.fn();

    renderCalendarView(
      container as unknown as HTMLElement,
      {
        mode: "month",
        focusDate: new Date("2026-05-08T12:00:00Z"),
        weekStart: "monday",
        visibleSourceIds: new Set(["vault"]),
        includeCompletedTasks: false,
        allowAppleReminderWriteback: false,
        allowTaskCreation: true,
        sources: [],
        t: (key) => key
      },
      [],
      [],
      {
        onLayerToggle: jest.fn(),
        onModeChange: jest.fn(),
        onMove: jest.fn(),
        onDateCreateTask,
        onTaskComplete: jest.fn(),
        onTaskJump: jest.fn(),
        onTaskReschedule: jest.fn(),
        onToday: jest.fn()
      }
    );

    const day = collect(container).find((element) => element.classes.has("task-hub-calendar-day") && element.text === "");
    day?.click();

    expect(onDateCreateTask).toHaveBeenCalledWith("2026-05-01");
  });

  it("aligns month days to the configured week start without rendering previous month days", () => {
    const container = new FakeElement();

    renderCalendarView(
      container as unknown as HTMLElement,
      {
        mode: "month",
        focusDate: new Date("2026-05-08T12:00:00Z"),
        weekStart: "monday",
        visibleSourceIds: new Set(["vault"]),
        includeCompletedTasks: false,
        allowAppleReminderWriteback: false,
        allowTaskCreation: true,
        sources: [],
        t: (key) => key
      },
      [],
      [],
      {
        onLayerToggle: jest.fn(),
        onModeChange: jest.fn(),
        onMove: jest.fn(),
        onDateCreateTask: jest.fn(),
        onTaskComplete: jest.fn(),
        onTaskJump: jest.fn(),
        onTaskReschedule: jest.fn(),
        onToday: jest.fn()
      }
    );

    const cells = collect(container).filter((element) => element.classes.has("task-hub-calendar-day") || element.classes.has("task-hub-calendar-day-placeholder"));
    expect(cells.slice(0, 4).every((element) => element.classes.has("task-hub-calendar-day-placeholder"))).toBe(true);
    expect(cells[4].classes.has("task-hub-calendar-day")).toBe(true);
    expect(collect(cells[4]).map((element) => element.text)).toContain("1");
  });

  it("renders all month day items inside a scrollable item area", () => {
    const container = new FakeElement();
    const manyTasks = Array.from({ length: 6 }, (_, index) => ({
      ...task,
      id: `task-${index}`,
      text: `Task ${index + 1}`,
      dueDate: "2026-05-08"
    }));

    renderCalendarView(
      container as unknown as HTMLElement,
      {
        mode: "month",
        focusDate: new Date("2026-05-08T12:00:00Z"),
        weekStart: "monday",
        visibleSourceIds: new Set(["vault"]),
        includeCompletedTasks: false,
        allowAppleReminderWriteback: false,
        allowTaskCreation: false,
        sources: [],
        t: (key) => key
      },
      manyTasks,
      [],
      {
        onLayerToggle: jest.fn(),
        onModeChange: jest.fn(),
        onMove: jest.fn(),
        onDateCreateTask: jest.fn(),
        onTaskComplete: jest.fn(),
        onTaskJump: jest.fn(),
        onTaskReschedule: jest.fn(),
        onToday: jest.fn()
      }
    );

    const itemArea = collect(container)
      .filter((element) => element.classes.has("task-hub-calendar-day-items"))
      .find((element) => collect(element).filter((child) => child.classes.has("task-hub-calendar-item")).length === 6);
    expect(itemArea).toBeDefined();
    expect(collect(itemArea as FakeElement).filter((element) => element.classes.has("task-hub-calendar-item"))).toHaveLength(6);
    expect(collect(container).map((element) => element.text)).not.toContain("+2 more");
  });

  it("does not create a task from a month day when calendar task creation is disabled", () => {
    const container = new FakeElement();
    const onDateCreateTask = jest.fn();

    renderCalendarView(
      container as unknown as HTMLElement,
      {
        mode: "month",
        focusDate: new Date("2026-05-08T12:00:00Z"),
        weekStart: "monday",
        visibleSourceIds: new Set(["vault"]),
        includeCompletedTasks: false,
        allowAppleReminderWriteback: false,
        allowTaskCreation: false,
        sources: [],
        t: (key) => key
      },
      [],
      [],
      {
        onLayerToggle: jest.fn(),
        onModeChange: jest.fn(),
        onMove: jest.fn(),
        onDateCreateTask,
        onTaskComplete: jest.fn(),
        onTaskJump: jest.fn(),
        onTaskReschedule: jest.fn(),
        onToday: jest.fn()
      }
    );

    const day = collect(container).find((element) => element.classes.has("task-hub-calendar-day") && element.text === "");
    day?.click();

    expect(onDateCreateTask).not.toHaveBeenCalled();
  });

  it("opens existing calendar tasks instead of creating a new task", () => {
    const container = new FakeElement();
    const onDateCreateTask = jest.fn();
    const onTaskJump = jest.fn();

    renderCalendarView(
      container as unknown as HTMLElement,
      {
        mode: "month",
        focusDate: new Date("2026-05-08T12:00:00Z"),
        weekStart: "monday",
        visibleSourceIds: new Set(["vault"]),
        includeCompletedTasks: false,
        allowAppleReminderWriteback: false,
        allowTaskCreation: true,
        sources: [],
        t: (key) => key
      },
      [task],
      [],
      {
        onLayerToggle: jest.fn(),
        onModeChange: jest.fn(),
        onMove: jest.fn(),
        onDateCreateTask,
        onTaskComplete: jest.fn(),
        onTaskJump,
        onTaskReschedule: jest.fn(),
        onToday: jest.fn()
      }
    );

    const item = collect(container).find((element) => element.classes.has("task-hub-calendar-item"));
    item?.click();

    expect(onTaskJump).toHaveBeenCalledWith(task);
    expect(onDateCreateTask).not.toHaveBeenCalled();
  });

  it("does not create a task when clicking an existing calendar event", () => {
    const container = new FakeElement();
    const onDateCreateTask = jest.fn();

    renderCalendarView(
      container as unknown as HTMLElement,
      {
        mode: "month",
        focusDate: new Date("2026-05-08T12:00:00Z"),
        weekStart: "monday",
        visibleSourceIds: new Set(["apple-calendar"]),
        includeCompletedTasks: false,
        allowAppleReminderWriteback: false,
        allowTaskCreation: true,
        sources: [source],
        t: (key) => key
      },
      [],
      [event],
      {
        onLayerToggle: jest.fn(),
        onModeChange: jest.fn(),
        onMove: jest.fn(),
        onDateCreateTask,
        onTaskComplete: jest.fn(),
        onTaskJump: jest.fn(),
        onTaskReschedule: jest.fn(),
        onToday: jest.fn()
      }
    );

    const item = collect(container).find((element) => element.classes.has("task-hub-calendar-item"));
    item?.click();

    expect(onDateCreateTask).not.toHaveBeenCalled();
  });

  it("creates a task from a week all-day slot when calendar task creation is enabled", () => {
    const container = new FakeElement();
    const onDateCreateTask = jest.fn();

    renderCalendarView(
      container as unknown as HTMLElement,
      {
        mode: "week",
        focusDate: new Date("2026-05-08T12:00:00Z"),
        weekStart: "monday",
        visibleSourceIds: new Set(["vault"]),
        includeCompletedTasks: false,
        allowAppleReminderWriteback: false,
        allowTaskCreation: true,
        sources: [],
        t: (key) => key
      },
      [],
      [],
      {
        onLayerToggle: jest.fn(),
        onModeChange: jest.fn(),
        onMove: jest.fn(),
        onDateCreateTask,
        onTaskComplete: jest.fn(),
        onTaskJump: jest.fn(),
        onTaskReschedule: jest.fn(),
        onToday: jest.fn()
      }
    );

    const slot = collect(container).find((element) => element.classes.has("task-hub-agenda-all-day-slot"));
    slot?.click();

    expect(onDateCreateTask).toHaveBeenCalledWith("2026-05-04");
  });

  it("creates a task from a week day header when calendar task creation is enabled", () => {
    const container = new FakeElement();
    const onDateCreateTask = jest.fn();

    renderCalendarView(
      container as unknown as HTMLElement,
      {
        mode: "week",
        focusDate: new Date("2026-05-08T12:00:00Z"),
        weekStart: "monday",
        visibleSourceIds: new Set(["vault"]),
        includeCompletedTasks: false,
        allowAppleReminderWriteback: false,
        allowTaskCreation: true,
        sources: [],
        t: (key) => key
      },
      [],
      [],
      {
        onLayerToggle: jest.fn(),
        onModeChange: jest.fn(),
        onMove: jest.fn(),
        onDateCreateTask,
        onTaskComplete: jest.fn(),
        onTaskJump: jest.fn(),
        onTaskReschedule: jest.fn(),
        onToday: jest.fn()
      }
    );

    const header = collect(container).find((element) => element.classes.has("task-hub-agenda-day-header"));
    header?.click();

    expect(onDateCreateTask).toHaveBeenCalledWith("2026-05-04");
  });

  it("does not create a task when clicking an existing timed calendar event", () => {
    const container = new FakeElement();
    const onDateCreateTask = jest.fn();

    renderCalendarView(
      container as unknown as HTMLElement,
      {
        mode: "day",
        focusDate: new Date("2026-05-08T12:00:00Z"),
        weekStart: "monday",
        visibleSourceIds: new Set(["apple-calendar"]),
        includeCompletedTasks: false,
        allowAppleReminderWriteback: false,
        allowTaskCreation: true,
        sources: [source],
        t: (key) => key
      },
      [],
      [{ ...event, start: "2026-05-08T09:00", end: "2026-05-08T10:00", allDay: false }],
      {
        onLayerToggle: jest.fn(),
        onModeChange: jest.fn(),
        onMove: jest.fn(),
        onDateCreateTask,
        onTaskComplete: jest.fn(),
        onTaskJump: jest.fn(),
        onTaskReschedule: jest.fn(),
        onToday: jest.fn()
      }
    );

    const item = collect(container).find((element) => element.classes.has("task-hub-calendar-timed-item"));
    item?.click();

    expect(onDateCreateTask).not.toHaveBeenCalled();
  });

  it("makes vault calendar tasks draggable", () => {
    const container = new FakeElement();

    renderCalendarView(
      container as unknown as HTMLElement,
      {
        mode: "month",
        focusDate: new Date("2026-05-08T12:00:00Z"),
        weekStart: "monday",
        visibleSourceIds: new Set(["vault"]),
        includeCompletedTasks: false,
        allowAppleReminderWriteback: false,
        allowTaskCreation: false,
        sources: [],
        t: (key) => key
      },
      [task],
      [],
      {
        onLayerToggle: jest.fn(),
        onModeChange: jest.fn(),
        onMove: jest.fn(),
        onDateCreateTask: jest.fn(),
        onTaskComplete: jest.fn(),
        onTaskJump: jest.fn(),
        onTaskReschedule: jest.fn(),
        onToday: jest.fn()
      }
    );

    const item = collect(container).find((element) => element.classes.has("task-hub-calendar-item"));

    expect(item?.draggable).toBe(true);
  });

  it("reschedules a dragged vault task when dropped on a month day", () => {
    const container = new FakeElement();
    const onTaskReschedule = jest.fn();

    renderCalendarView(
      container as unknown as HTMLElement,
      {
        mode: "month",
        focusDate: new Date("2026-05-08T12:00:00Z"),
        weekStart: "monday",
        visibleSourceIds: new Set(["vault"]),
        includeCompletedTasks: false,
        allowAppleReminderWriteback: false,
        allowTaskCreation: false,
        sources: [],
        t: (key) => key
      },
      [task],
      [],
      {
        onLayerToggle: jest.fn(),
        onModeChange: jest.fn(),
        onMove: jest.fn(),
        onDateCreateTask: jest.fn(),
        onTaskComplete: jest.fn(),
        onTaskJump: jest.fn(),
        onTaskReschedule,
        onToday: jest.fn()
      }
    );

    const item = collect(container).find((element) => element.classes.has("task-hub-calendar-item"));
    const targetDay = collect(container)
      .filter((element) => element.classes.has("task-hub-calendar-day"))
      .find((element) => collect(element).map((child) => child.text).includes("12"));
    const dataTransfer = new FakeDataTransfer();
    item?.dispatch("dragstart", { dataTransfer });
    targetDay?.dispatch("drop", { dataTransfer });

    expect(onTaskReschedule).toHaveBeenCalledWith(task, "2026-05-12");
  });

  it("does not make Apple Reminder tasks draggable when writeback is disabled", () => {
    const container = new FakeElement();

    renderCalendarView(
      container as unknown as HTMLElement,
      {
        mode: "month",
        focusDate: new Date("2026-05-08T12:00:00Z"),
        weekStart: "monday",
        visibleSourceIds: new Set(["apple-reminders"]),
        includeCompletedTasks: false,
        allowAppleReminderWriteback: false,
        allowTaskCreation: false,
        sources: [remindersSource],
        t: (key) => key
      },
      [{ ...task, source: "apple-reminders" }],
      [],
      {
        onLayerToggle: jest.fn(),
        onModeChange: jest.fn(),
        onMove: jest.fn(),
        onDateCreateTask: jest.fn(),
        onTaskComplete: jest.fn(),
        onTaskJump: jest.fn(),
        onTaskReschedule: jest.fn(),
        onToday: jest.fn()
      }
    );

    const item = collect(container).find((element) => element.classes.has("task-hub-calendar-item"));

    expect(item?.draggable).toBe(false);
  });

  it("reschedules a dragged Apple Reminder when writeback is enabled in month view", () => {
    const container = new FakeElement();
    const onTaskReschedule = jest.fn();
    const reminderTask = { ...task, source: "apple-reminders" as const, externalId: "reminder-1" };

    renderCalendarView(
      container as unknown as HTMLElement,
      {
        mode: "month",
        focusDate: new Date("2026-05-08T12:00:00Z"),
        weekStart: "monday",
        visibleSourceIds: new Set(["apple-reminders"]),
        includeCompletedTasks: false,
        allowAppleReminderWriteback: true,
        allowTaskCreation: false,
        sources: [remindersSource],
        t: (key) => key
      },
      [reminderTask],
      [],
      {
        onLayerToggle: jest.fn(),
        onModeChange: jest.fn(),
        onMove: jest.fn(),
        onDateCreateTask: jest.fn(),
        onTaskComplete: jest.fn(),
        onTaskJump: jest.fn(),
        onTaskReschedule,
        onToday: jest.fn()
      }
    );

    const item = collect(container).find((element) => element.classes.has("task-hub-calendar-item"));
    const targetDay = collect(container)
      .filter((element) => element.classes.has("task-hub-calendar-day"))
      .find((element) => collect(element).map((child) => child.text).includes("12"));
    const dataTransfer = new FakeDataTransfer();
    item?.dispatch("dragstart", { dataTransfer });
    targetDay?.dispatch("drop", { dataTransfer });

    expect(item?.draggable).toBe(true);
    expect(onTaskReschedule).toHaveBeenCalledWith(reminderTask, "2026-05-12");
  });

  it("accepts task drops when dragover cannot read transfer data yet", () => {
    const container = new FakeElement();
    const onTaskReschedule = jest.fn();
    const reminderTask = { ...task, source: "apple-reminders" as const, externalId: "reminder-1" };

    renderCalendarView(
      container as unknown as HTMLElement,
      {
        mode: "month",
        focusDate: new Date("2026-05-08T12:00:00Z"),
        weekStart: "monday",
        visibleSourceIds: new Set(["apple-reminders"]),
        includeCompletedTasks: false,
        allowAppleReminderWriteback: true,
        allowTaskCreation: false,
        sources: [remindersSource],
        t: (key) => key
      },
      [reminderTask],
      [],
      {
        onLayerToggle: jest.fn(),
        onModeChange: jest.fn(),
        onMove: jest.fn(),
        onDateCreateTask: jest.fn(),
        onTaskComplete: jest.fn(),
        onTaskJump: jest.fn(),
        onTaskReschedule,
        onToday: jest.fn()
      }
    );

    const item = collect(container).find((element) => element.classes.has("task-hub-calendar-item"));
    const targetDay = collect(container)
      .filter((element) => element.classes.has("task-hub-calendar-day"))
      .find((element) => collect(element).map((child) => child.text).includes("12"));
    const dataTransfer = new FakeDataTransfer();
    item?.dispatch("dragstart", { dataTransfer });
    dataTransfer.hideData = true;
    const dragover = targetDay?.dispatch("dragover", { dataTransfer });
    dataTransfer.hideData = false;
    targetDay?.dispatch("drop", { dataTransfer });

    expect(dragover?.preventDefault).toHaveBeenCalled();
    expect(onTaskReschedule).toHaveBeenCalledWith(reminderTask, "2026-05-12");
  });

  it("reschedules a dragged Apple Reminder when writeback is enabled in week view", () => {
    const container = new FakeElement();
    const onTaskReschedule = jest.fn();
    const reminderTask = { ...task, source: "apple-reminders" as const, externalId: "reminder-1" };

    renderCalendarView(
      container as unknown as HTMLElement,
      {
        mode: "week",
        focusDate: new Date("2026-05-08T12:00:00Z"),
        weekStart: "monday",
        visibleSourceIds: new Set(["apple-reminders"]),
        includeCompletedTasks: false,
        allowAppleReminderWriteback: true,
        allowTaskCreation: false,
        sources: [remindersSource],
        t: (key) => key
      },
      [reminderTask],
      [],
      {
        onLayerToggle: jest.fn(),
        onModeChange: jest.fn(),
        onMove: jest.fn(),
        onDateCreateTask: jest.fn(),
        onTaskComplete: jest.fn(),
        onTaskJump: jest.fn(),
        onTaskReschedule,
        onToday: jest.fn()
      }
    );

    const item = collect(container).find((element) => element.classes.has("task-hub-calendar-item"));
    const targetSlot = collect(container).filter((element) => element.classes.has("task-hub-agenda-all-day-slot"))[2];
    const dataTransfer = new FakeDataTransfer();
    item?.dispatch("dragstart", { dataTransfer });
    targetSlot?.dispatch("drop", { dataTransfer });

    expect(onTaskReschedule).toHaveBeenCalledWith(reminderTask, "2026-05-06");
  });

  it("reschedules a dragged Apple Reminder when writeback is enabled in day view", () => {
    const container = new FakeElement();
    const onTaskReschedule = jest.fn();
    const reminderTask = { ...task, source: "apple-reminders" as const, externalId: "reminder-1" };

    renderCalendarView(
      container as unknown as HTMLElement,
      {
        mode: "day",
        focusDate: new Date("2026-05-08T12:00:00Z"),
        weekStart: "monday",
        visibleSourceIds: new Set(["apple-reminders"]),
        includeCompletedTasks: false,
        allowAppleReminderWriteback: true,
        allowTaskCreation: false,
        sources: [remindersSource],
        t: (key) => key
      },
      [reminderTask],
      [],
      {
        onLayerToggle: jest.fn(),
        onModeChange: jest.fn(),
        onMove: jest.fn(),
        onDateCreateTask: jest.fn(),
        onTaskComplete: jest.fn(),
        onTaskJump: jest.fn(),
        onTaskReschedule,
        onToday: jest.fn()
      }
    );

    const item = collect(container).find((element) => element.classes.has("task-hub-calendar-item"));
    const targetSlot = collect(container).find((element) => element.classes.has("task-hub-agenda-all-day-slot"));
    const dataTransfer = new FakeDataTransfer();
    item?.dispatch("dragstart", { dataTransfer });
    targetSlot?.dispatch("drop", { dataTransfer });

    expect(onTaskReschedule).toHaveBeenCalledWith(reminderTask, "2026-05-08");
  });
});
