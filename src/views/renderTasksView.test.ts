import { renderTasksView } from "./renderTasksView";
import type { TaskItem } from "../types";

class FakeElement {
  children: FakeElement[] = [];
  checked = false;
  disabled = false;
  text = "";
  type = "";
  value = "";
  classes = new Set<string>();
  listeners = new Map<string, Array<(event: { stopPropagation(): void }) => void>>();

  empty(): void {
    this.children = [];
  }

  createDiv(options: { cls?: string; text?: string } = {}): FakeElement {
    return this.append(options);
  }

  createEl(tag: string, options: { attr?: Record<string, string>; cls?: string; type?: string; text?: string; value?: string } = {}): FakeElement {
    const child = this.append(options);
    child.type = options.type ?? tag;
    child.value = options.value ?? "";
    return child;
  }

  createSpan(options: { text?: string } = {}): FakeElement {
    return this.append({ text: options.text });
  }

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

const baseTask: TaskItem = {
  id: "apple-reminders:1",
  externalId: "reminder-1",
  externalSourceName: "Reminders",
  filePath: "Apple Reminders/Reminders",
  line: 0,
  rawLine: "",
  text: "Buy milk",
  completed: false,
  tags: [],
  dueDate: "2026-05-08",
  source: "apple-reminders"
};

function findCheckbox(element: FakeElement): FakeElement | undefined {
  if (element.type === "checkbox") return element;
  for (const child of element.children) {
    const found = findCheckbox(child);
    if (found) return found;
  }
  return undefined;
}

function collect(element: FakeElement): FakeElement[] {
  return [element, ...element.children.flatMap(collect)];
}

describe("renderTasksView", () => {
  const handlers = () => ({
    onComplete: jest.fn(),
    onJump: jest.fn(),
    onSelect: jest.fn(),
    onTagSelect: jest.fn(),
    onTagQueryChange: jest.fn(),
    onSourceSelect: jest.fn()
  });

  it("disables Apple Reminders checkboxes when writeback is disabled", () => {
    const container = new FakeElement();

    renderTasksView(
      container as unknown as HTMLElement,
      [baseTask],
      [baseTask],
      { status: "open", tags: [], sourceQuery: "", textQuery: "" },
      handlers(),
      new Date("2026-05-08T12:00:00Z"),
      (key) => key,
      { allowAppleReminderWriteback: false }
    );

    expect(findCheckbox(container)?.disabled).toBe(true);
  });

  it("enables Apple Reminders checkboxes when writeback is enabled", () => {
    const container = new FakeElement();

    renderTasksView(
      container as unknown as HTMLElement,
      [baseTask],
      [baseTask],
      { status: "open", tags: [], sourceQuery: "", textQuery: "" },
      handlers(),
      new Date("2026-05-08T12:00:00Z"),
      (key) => key,
      { allowAppleReminderWriteback: true }
    );

    expect(findCheckbox(container)?.disabled).toBe(false);
  });

  it("marks completed task rows for completed styling", () => {
    const container = new FakeElement();

    renderTasksView(
      container as unknown as HTMLElement,
      [{ ...baseTask, completed: true }],
      [{ ...baseTask, completed: true }],
      { status: "all", tags: [], sourceQuery: "", textQuery: "" },
      handlers(),
      new Date("2026-05-08T12:00:00Z"),
      (key) => key,
      { allowAppleReminderWriteback: true }
    );

    expect(collect(container).some((element) => element.classes.has("task-hub-task-row") && element.classes.has("is-completed"))).toBe(true);
  });

  it("selects the first open task when completed tasks arrive first", () => {
    const container = new FakeElement();

    renderTasksView(
      container as unknown as HTMLElement,
      [
        { ...baseTask, id: "done-first", text: "Done first", completed: true },
        { ...baseTask, id: "open-second", text: "Open second", completed: false }
      ],
      [
        { ...baseTask, id: "done-first", text: "Done first", completed: true },
        { ...baseTask, id: "open-second", text: "Open second", completed: false }
      ],
      { status: "all", tags: [], sourceQuery: "", textQuery: "" },
      handlers(),
      new Date("2026-05-08T12:00:00Z"),
      (key) => key,
      { allowAppleReminderWriteback: true }
    );

    expect(collect(container).some((element) => element.classes.has("task-hub-detail-title") && element.text === "Open second")).toBe(true);
  });

  it("renders a searchable multi-select tag panel", () => {
    const container = new FakeElement();
    const tasks = [
      { ...baseTask, id: "a", tags: ["#alpha"] },
      { ...baseTask, id: "b", tags: ["#beta"] },
      { ...baseTask, id: "c", tags: ["#client/acme"] }
    ];

    renderTasksView(
      container as unknown as HTMLElement,
      tasks,
      tasks,
      { status: "open", tags: ["#beta"], tagQuery: "be", sourceQuery: "", textQuery: "" },
      handlers(),
      new Date("2026-05-08T12:00:00Z"),
      (key) => key,
      { allowAppleReminderWriteback: true }
    );

    const elements = collect(container);
    const tagOptions = elements.filter((element) => element.classes.has("task-hub-sidebar-tag-option"));
    expect(elements.some((element) => element.classes.has("task-hub-sidebar-tag-options"))).toBe(true);
    expect(tagOptions.some((element) => element.children.some((child) => child.text === "#beta"))).toBe(true);
    expect(tagOptions.some((element) => element.children.some((child) => child.text === "#alpha"))).toBe(false);
    expect(tagOptions.some((element) => element.classes.has("is-active"))).toBe(true);
  });
});
