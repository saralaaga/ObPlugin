import type { Translator } from "../i18n";
import type { TaskItem } from "../types";

export type TagViewHandlers = {
  onTagSelect: (tag: string) => void;
  onTaskComplete: (task: TaskItem) => void;
  onTaskSelect: (task: TaskItem) => void;
};

export type TagRenderOptions = {
  allowAppleReminderWriteback: boolean;
};

export function renderTagsView(
  container: HTMLElement,
  tasks: TaskItem[],
  handlers: TagViewHandlers,
  t: Translator,
  options: TagRenderOptions = { allowAppleReminderWriteback: false }
): void {
  container.empty();

  const groups = buildTagGroups(tasks);
  if (groups.length === 0) {
    container.createDiv({ cls: "task-hub-empty", text: t("noTags") });
    return;
  }

  const grid = container.createDiv({ cls: "task-hub-tag-grid" });
  for (const group of groups) {
    renderTagCard(grid, group, handlers, t, options);
  }
}

function renderTagCard(
  container: HTMLElement,
  group: TagGroup,
  handlers: TagViewHandlers,
  t: Translator,
  options: TagRenderOptions
): void {
  const card = container.createDiv({ cls: "task-hub-tag-card" });
  const header = card.createDiv({ cls: "task-hub-tag-header" });
  header.createSpan({ cls: "task-hub-tag-title", text: group.tag });
  header.addEventListener("click", () => handlers.onTagSelect(group.tag));
  renderMetrics(header, group.tasks, t);
  const taskList = card.createDiv({ cls: "task-hub-tag-task-list" });
  for (const task of sortTagTasks(group.tasks)) {
    renderTagTask(taskList, task, handlers, options);
  }
}

function renderTagTask(container: HTMLElement, task: TaskItem, handlers: TagViewHandlers, options: TagRenderOptions): void {
  const item = container.createDiv({ cls: `task-hub-tag-task ${task.completed ? "is-completed" : ""}` });
  const checkbox = item.createEl("input", { type: "checkbox" });
  checkbox.checked = task.completed;
  checkbox.disabled = task.source !== "vault" && !(task.source === "apple-reminders" && options.allowAppleReminderWriteback);
  checkbox.addEventListener("click", (event) => {
    event.stopPropagation();
    handlers.onTaskComplete(task);
  });
  item.createSpan({ cls: "task-hub-tag-task-title", text: task.text });
  item.addEventListener("click", () => handlers.onTaskSelect(task));
}

function renderMetrics(container: HTMLElement, tasks: TaskItem[], t: Translator): void {
  const open = tasks.filter((task) => !task.completed).length;
  const metrics = container.createDiv({ cls: "task-hub-tag-metrics" });
  metrics.createSpan({ text: `${open} ${t("open")}` });
  metrics.createSpan({ text: `${tasks.length} ${t("all")}` });
}

function sortTagTasks(tasks: TaskItem[]): TaskItem[] {
  return tasks
    .map((task, index) => ({ task, index }))
    .sort((left, right) => Number(left.task.completed) - Number(right.task.completed) || left.index - right.index)
    .map(({ task }) => task);
}

type TagGroup = {
  tag: string;
  tasks: TaskItem[];
};

function buildTagGroups(tasks: TaskItem[]): TagGroup[] {
  const groups = new Map<string, TaskItem[]>();
  for (const task of tasks) {
    for (const tag of task.tags) {
      groups.set(tag, [...(groups.get(tag) ?? []), task]);
    }
  }

  return Array.from(groups.entries())
    .map(([tag, groupTasks]) => ({ tag, tasks: groupTasks }))
    .sort((left, right) => {
      const openDelta = right.tasks.filter((task) => !task.completed).length - left.tasks.filter((task) => !task.completed).length;
      if (openDelta !== 0) return openDelta;
      return left.tag.localeCompare(right.tag);
    });
}
