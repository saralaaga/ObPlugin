import { renderTagsView } from "./renderTagsView";
import type { TaskItem } from "../types";

class FakeElement {
  children: FakeElement[] = [];
  checked = false;
  disabled = false;
  text = "";
  type = "";
  classes = new Set<string>();
  listeners = new Map<string, Array<(event: { stopPropagation(): void }) => void>>();

  empty(): void {
    this.children = [];
  }

  createDiv(options: { cls?: string; text?: string } = {}): FakeElement {
    return this.append(options);
  }

  createEl(tag: string, options: { cls?: string; text?: string; type?: string } = {}): FakeElement {
    const child = this.append(options);
    child.type = options.type ?? tag;
    return child;
  }

  createSpan(options: { text?: string } = {}): FakeElement {
    return this.append({ text: options.text });
  }

  addEventListener(name: string, listener: (event: { stopPropagation(): void }) => void): void {
    this.listeners.set(name, [...(this.listeners.get(name) ?? []), listener]);
  }

  click(): void {
    for (const listener of this.listeners.get("click") ?? []) {
      listener({ stopPropagation: jest.fn() });
    }
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

function collect(element: FakeElement): FakeElement[] {
  return [element, ...element.children.flatMap(collect)];
}

function findCheckbox(element: FakeElement): FakeElement | undefined {
  return collect(element).find((child) => child.type === "checkbox");
}

const task = (id: string, text: string, tags: string[], completed = false): TaskItem => ({
  id,
  filePath: "Project.md",
  line: 0,
  rawLine: completed ? `- [x] ${text}` : `- [ ] ${text}`,
  text,
  completed,
  tags,
  source: "vault"
});

describe("renderTagsView", () => {
  it("renders tag cards with their tasks", () => {
    const container = new FakeElement();

    renderTagsView(
      container as unknown as HTMLElement,
      [task("a", "Open task", ["#work"]), task("b", "Done task", ["#work"], true), task("c", "Other task", ["#daily"])],
      { onTagSelect: jest.fn(), onTaskComplete: jest.fn(), onTaskSelect: jest.fn() },
      (key) => key
    );

    const elements = collect(container);
    expect(elements.some((element) => element.classes.has("task-hub-tag-card"))).toBe(true);
    expect(elements.some((element) => element.classes.has("task-hub-tag-title") && element.text === "#work")).toBe(true);
    expect(elements.some((element) => element.classes.has("task-hub-tag-task-title") && element.text === "Open task")).toBe(true);
    expect(elements.some((element) => element.classes.has("task-hub-tag-task-title") && element.text === "Done task")).toBe(true);
  });

  it("orders open tasks before completed tasks inside a tag card", () => {
    const container = new FakeElement();

    renderTagsView(
      container as unknown as HTMLElement,
      [task("done", "Done task", ["#work"], true), task("open", "Open task", ["#work"])],
      { onTagSelect: jest.fn(), onTaskComplete: jest.fn(), onTaskSelect: jest.fn() },
      (key) => key
    );

    const taskTitles = collect(container).filter((element) => element.classes.has("task-hub-tag-task-title")).map((element) => element.text);
    expect(taskTitles).toEqual(["Open task", "Done task"]);
  });

  it("selects a task from a tag card", () => {
    const container = new FakeElement();
    const selectedTask = task("open", "Open task", ["#work"]);
    const onTaskSelect = jest.fn();

    renderTagsView(
      container as unknown as HTMLElement,
      [selectedTask],
      { onTagSelect: jest.fn(), onTaskComplete: jest.fn(), onTaskSelect },
      (key) => key
    );

    const taskButton = collect(container).find((element) => element.classes.has("task-hub-tag-task-title"));
    taskButton?.click();
    expect(onTaskSelect).toHaveBeenCalledWith(selectedTask);
  });

  it("completes a task from a tag card checkbox", () => {
    const container = new FakeElement();
    const selectedTask = task("open", "Open task", ["#work"]);
    const onTaskComplete = jest.fn();

    renderTagsView(
      container as unknown as HTMLElement,
      [selectedTask],
      { onTagSelect: jest.fn(), onTaskComplete, onTaskSelect: jest.fn() },
      (key) => key,
      { allowAppleReminderWriteback: true }
    );

    findCheckbox(container)?.click();

    expect(onTaskComplete).toHaveBeenCalledWith(selectedTask);
  });

  it("renders only the tasks provided by the caller", () => {
    const container = new FakeElement();

    renderTagsView(
      container as unknown as HTMLElement,
      [task("open", "Open task", ["#work"])],
      { onTagSelect: jest.fn(), onTaskComplete: jest.fn(), onTaskSelect: jest.fn() },
      (key) => key
    );

    const taskTitles = collect(container).filter((element) => element.classes.has("task-hub-tag-task-title")).map((element) => element.text);
    expect(taskTitles).toEqual(["Open task"]);
  });
});
