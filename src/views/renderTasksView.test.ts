import { renderTasksView } from "./renderTasksView";
import type { TaskItem } from "../types";

class FakeElement {
  children: FakeElement[] = [];
  checked = false;
  disabled = false;
  text = "";
  type = "";
  listeners = new Map<string, Array<(event: { stopPropagation(): void }) => void>>();

  empty(): void {
    this.children = [];
  }

  createDiv(options: { cls?: string; text?: string } = {}): FakeElement {
    return this.append(options);
  }

  createEl(tag: string, options: { type?: string; text?: string } = {}): FakeElement {
    const child = this.append({ text: options.text });
    child.type = options.type ?? tag;
    return child;
  }

  createSpan(options: { text?: string } = {}): FakeElement {
    return this.append({ text: options.text });
  }

  addEventListener(name: string, listener: (event: { stopPropagation(): void }) => void): void {
    this.listeners.set(name, [...(this.listeners.get(name) ?? []), listener]);
  }

  private append(options: { text?: string } = {}): FakeElement {
    const child = new FakeElement();
    child.text = options.text ?? "";
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

describe("renderTasksView", () => {
  const handlers = () => ({
    onComplete: jest.fn(),
    onJump: jest.fn(),
    onSelect: jest.fn(),
    onDateBucketSelect: jest.fn(),
    onTagSelect: jest.fn(),
    onSourceSelect: jest.fn()
  });

  it("disables Apple Reminders checkboxes when writeback is disabled", () => {
    const container = new FakeElement();

    renderTasksView(
      container as unknown as HTMLElement,
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
      { status: "open", tags: [], sourceQuery: "", textQuery: "" },
      handlers(),
      new Date("2026-05-08T12:00:00Z"),
      (key) => key,
      { allowAppleReminderWriteback: true }
    );

    expect(findCheckbox(container)?.disabled).toBe(false);
  });
});
