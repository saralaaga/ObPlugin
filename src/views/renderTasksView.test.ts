import { renderTasksView } from "./renderTasksView";
import type { TaskItem } from "../types";

class FakeElement {
  children: FakeElement[] = [];
  attrs = new Map<string, string>();
  checked = false;
  disabled = false;
  text = "";
  type = "";
  value = "";
  scrollTop = 0;
  classes = new Set<string>();
  style = { setProperty: jest.fn() };
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

  createSpan(options: { cls?: string; text?: string } = {}): FakeElement {
    return this.append(options);
  }

  setAttr(name: string, value: string): void {
    this.attrs.set(name, value);
  }

  addEventListener(name: string, listener: (event: { stopPropagation(): void }) => void): void {
    this.listeners.set(name, [...(this.listeners.get(name) ?? []), listener]);
  }

  click(): void {
    for (const listener of this.listeners.get("click") ?? []) {
      listener({ stopPropagation: jest.fn() });
    }
  }

  change(): void {
    for (const listener of this.listeners.get("change") ?? []) {
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

function findElementByText(element: FakeElement, text: string): FakeElement | undefined {
  return collect(element).find((child) => child.text === text);
}

function findAncestorWithClass(root: FakeElement, target: FakeElement, className: string): FakeElement | undefined {
  for (const child of root.children) {
    if (child === target) return root.classes.has(className) ? root : undefined;
    const found = findAncestorWithClass(child, target, className);
    if (found) return found;
  }
  return undefined;
}

function textValues(element: FakeElement): string[] {
  return collect(element).map((child) => child.text).filter(Boolean);
}

describe("renderTasksView", () => {
  const handlers = () => ({
    onComplete: jest.fn(),
    onJump: jest.fn(),
    onSendToAppleReminders: jest.fn(),
    onSelect: jest.fn(),
    onTagSelect: jest.fn(),
    onTagQueryChange: jest.fn(),
    onSourceSelect: jest.fn(),
    onAppleReminderListChange: jest.fn()
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

  it("applies source colors to Apple Reminders task rows", () => {
    const container = new FakeElement();

    renderTasksView(
      container as unknown as HTMLElement,
      [baseTask],
      [baseTask],
      { status: "open", tags: [], sourceQuery: "", textQuery: "" },
      handlers(),
      new Date("2026-05-08T12:00:00Z"),
      (key) => key,
      { allowAppleReminderWriteback: true, sourceColors: { "apple-reminders": "#22c55e" } }
    );

    const row = collect(container).find((element) => element.classes.has("task-hub-task-row"));
    expect(row?.style.setProperty).toHaveBeenCalledWith("--task-hub-source-color", "#22c55e");
  });

  it("applies the Obsidian theme color to vault task rows", () => {
    const container = new FakeElement();
    const vaultTask = { ...baseTask, id: "vault-1", source: "vault" as const, filePath: "Project.md", externalSourceName: undefined };

    renderTasksView(
      container as unknown as HTMLElement,
      [vaultTask],
      [vaultTask],
      { status: "open", tags: [], sourceQuery: "", textQuery: "" },
      handlers(),
      new Date("2026-05-08T12:00:00Z"),
      (key) => key,
      { allowAppleReminderWriteback: true, sourceColors: { vault: "var(--interactive-accent)" } }
    );

    const row = collect(container).find((element) => element.classes.has("task-hub-task-row"));
    expect(row?.style.setProperty).toHaveBeenCalledWith("--task-hub-source-color", "var(--interactive-accent)");
  });

  it("renders task tags as individual tag chips", () => {
    const container = new FakeElement();
    const task = { ...baseTask, tags: ["#project", "#client/acme"] };

    renderTasksView(
      container as unknown as HTMLElement,
      [task],
      [task],
      { status: "open", tags: [], sourceQuery: "", textQuery: "" },
      handlers(),
      new Date("2026-05-08T12:00:00Z"),
      (key) => key,
      { allowAppleReminderWriteback: true }
    );

    const chips = collect(container).filter((element) => element.classes.has("task-hub-task-tag"));
    expect(chips.map((chip) => chip.text)).toEqual(["#project", "#client/acme"]);
  });

  it("renders escaped Markdown punctuation in task titles as plain text", () => {
    const container = new FakeElement();
    const task = { ...baseTask, text: "5 号楼缺少空调 \\* 3" };

    renderTasksView(
      container as unknown as HTMLElement,
      [task],
      [task],
      { status: "open", tags: [], sourceQuery: "", textQuery: "" },
      handlers(),
      new Date("2026-05-08T12:00:00Z"),
      (key) => key,
      { allowAppleReminderWriteback: true }
    );

    expect(collect(container).some((element) => element.classes.has("task-hub-task-text") && element.text === "5 号楼缺少空调 * 3")).toBe(true);
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

  it("keeps task list cards free of context preview while details show context", () => {
    const container = new FakeElement();
    const task = { ...baseTask, contextPreview: "Context line that should only appear in details" };

    renderTasksView(
      container as unknown as HTMLElement,
      [task],
      [task],
      { status: "open", tags: [], sourceQuery: "", textQuery: "" },
      handlers(),
      new Date("2026-05-08T12:00:00Z"),
      (key) => key,
      { allowAppleReminderWriteback: true }
    );

    const elements = collect(container);
    expect(elements.some((element) => element.classes.has("task-hub-task-preview"))).toBe(false);
    expect(elements.some((element) => element.classes.has("task-hub-detail-context") && element.text === task.contextPreview)).toBe(true);
  });

  it("keeps task filters visible when active filters match no tasks", () => {
    const container = new FakeElement();

    renderTasksView(
      container as unknown as HTMLElement,
      [],
      [baseTask],
      { status: "open", tags: ["#missing"], sourceQuery: "", textQuery: "" },
      handlers(),
      new Date("2026-05-08T12:00:00Z"),
      (key) => key,
      { allowAppleReminderWriteback: true }
    );

    const elements = collect(container);
    expect(elements.some((element) => element.classes.has("task-hub-task-workbench"))).toBe(true);
    expect(elements.some((element) => element.classes.has("task-hub-task-sidebar"))).toBe(true);
    expect(elements.some((element) => element.classes.has("task-hub-task-list-pane"))).toBe(true);
    expect(elements.some((element) => element.classes.has("task-hub-task-details"))).toBe(false);
    expect(elements.some((element) => element.classes.has("task-hub-empty") && element.text === "noMatchingTasks")).toBe(true);
  });

  it("restores the task list scroll position after rendering", () => {
    const container = new FakeElement();

    renderTasksView(
      container as unknown as HTMLElement,
      [baseTask],
      [baseTask],
      { status: "open", tags: [], sourceQuery: "", textQuery: "" },
      handlers(),
      new Date("2026-05-08T12:00:00Z"),
      (key) => key,
      { allowAppleReminderWriteback: true, taskListScrollTop: 320 }
    );

    const list = collect(container).find((element) => element.classes.has("task-hub-task-list-pane"));

    expect(list?.scrollTop).toBe(320);
  });

  it("keeps source counts stable when one source is selected", () => {
    const container = new FakeElement();
    const vaultTask = { ...baseTask, id: "vault-1", source: "vault" as const, filePath: "Project.md", externalSourceName: undefined };
    const appleTask = { ...baseTask, id: "apple-1", source: "apple-reminders" as const };

    renderTasksView(
      container as unknown as HTMLElement,
      [appleTask],
      [vaultTask, appleTask],
      { status: "open", tags: [], sourceQuery: "apple-reminders", textQuery: "" },
      handlers(),
      new Date("2026-05-08T12:00:00Z"),
      (key) => key,
      { allowAppleReminderWriteback: true }
    );

    const texts = textValues(container);
    expect(texts).toContain("all");
    expect(texts).toContain("2");
    expect(texts).toContain("vaultTasks");
    expect(texts).toContain("1");
    expect(texts).toContain("Apple Reminders");
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

  it("opens the selected vault task from the detail panel", () => {
    const container = new FakeElement();
    const task = { ...baseTask, id: "vault-detail", source: "vault" as const, filePath: "Project.md", externalSourceName: undefined };
    const testHandlers = handlers();

    renderTasksView(
      container as unknown as HTMLElement,
      [task],
      [task],
      { status: "open", tags: [], sourceQuery: "", textQuery: "" },
      testHandlers,
      new Date("2026-05-08T12:00:00Z"),
      (key) => key,
      { allowAppleReminderWriteback: true }
    );

    findElementByText(container, "openSource")?.click();

    expect(testHandlers.onJump).toHaveBeenCalledWith(task);
  });

  it("opens the selected Apple Reminders task from the detail panel", () => {
    const container = new FakeElement();
    const testHandlers = handlers();

    renderTasksView(
      container as unknown as HTMLElement,
      [baseTask],
      [baseTask],
      { status: "open", tags: [], sourceQuery: "", textQuery: "" },
      testHandlers,
      new Date("2026-05-08T12:00:00Z"),
      (key) => key,
      { allowAppleReminderWriteback: false }
    );

    const openButton = findElementByText(container, "openSource");
    expect(openButton?.disabled).toBe(false);
    openButton?.click();

    expect(testHandlers.onJump).toHaveBeenCalledWith(baseTask);
  });

  it("renders an Apple Reminders send action for vault tasks when creation is enabled", () => {
    const container = new FakeElement();
    const task = { ...baseTask, id: "vault-send", source: "vault" as const, filePath: "Project.md", externalSourceName: undefined };
    const testHandlers = handlers();

    renderTasksView(
      container as unknown as HTMLElement,
      [task],
      [task],
      { status: "open", tags: [], sourceQuery: "", textQuery: "" },
      testHandlers,
      new Date("2026-05-08T12:00:00Z"),
      (key) => key,
      { allowAppleReminderWriteback: true, allowAppleReminderCreate: true }
    );

    findElementByText(container, "sendToAppleReminders")?.click();

    const actions = collect(container).find((element) => element.classes.has("task-hub-detail-actions"));
    const sendButton = findElementByText(container, "sendToAppleReminders");
    expect(testHandlers.onSendToAppleReminders).toHaveBeenCalledWith(task);
    expect(actions?.classes.has("has-three-actions")).toBe(true);
    expect(sendButton?.classes.has("mod-cta")).toBe(true);
  });

  it("hides the Apple Reminders send action when creation is disabled", () => {
    const container = new FakeElement();
    const task = { ...baseTask, id: "vault-send", source: "vault" as const, filePath: "Project.md", externalSourceName: undefined };

    renderTasksView(
      container as unknown as HTMLElement,
      [task],
      [task],
      { status: "open", tags: [], sourceQuery: "", textQuery: "" },
      handlers(),
      new Date("2026-05-08T12:00:00Z"),
      (key) => key,
      { allowAppleReminderWriteback: true, allowAppleReminderCreate: false }
    );

    expect(findElementByText(container, "sendToAppleReminders")).toBeUndefined();
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

  it("excludes completed tasks from tag counts when completed tasks are hidden", () => {
    const container = new FakeElement();
    const openTask = { ...baseTask, id: "open-alpha", tags: ["#alpha"] };
    const completedTask = { ...baseTask, id: "done-alpha", completed: true, tags: ["#alpha"] };

    renderTasksView(
      container as unknown as HTMLElement,
      [openTask],
      [openTask, completedTask],
      { status: "open", tags: [], sourceQuery: "", textQuery: "" },
      handlers(),
      new Date("2026-05-08T12:00:00Z"),
      (key) => key,
      { allowAppleReminderWriteback: true }
    );

    const tagText = findElementByText(container, "#alpha");
    const tagOption = tagText ? findAncestorWithClass(container, tagText, "task-hub-sidebar-tag-option") : undefined;

    expect(tagOption?.children.some((child) => child.text === "1")).toBe(true);
    expect(tagOption?.children.some((child) => child.text === "2")).toBe(false);
  });

  it("allows selecting parent tags for nested tag groups", () => {
    const container = new FakeElement();
    const testHandlers = handlers();
    const tasks = [
      { ...baseTask, id: "nested", tags: ["#client/acme"] }
    ];

    renderTasksView(
      container as unknown as HTMLElement,
      tasks,
      tasks,
      { status: "open", tags: [], sourceQuery: "", textQuery: "" },
      testHandlers,
      new Date("2026-05-08T12:00:00Z"),
      (key) => key,
      { allowAppleReminderWriteback: true }
    );

    const parentText = findElementByText(container, "#client");
    const parentOption = parentText ? findAncestorWithClass(container, parentText, "task-hub-sidebar-tag-option") : undefined;
    const parentCheckbox = parentOption?.children.find((child) => child.type === "checkbox");
    parentCheckbox?.change();

    expect(parentOption).toBeDefined();
    expect(testHandlers.onTagSelect).toHaveBeenCalledWith("#client");
  });

});
