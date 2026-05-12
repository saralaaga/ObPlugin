import type { Translator } from "../i18n";
import type { TaskItem } from "../types";

export type TagViewHandlers = {
  onTagSelect: (tag: string) => void;
  onTaskComplete: (task: TaskItem) => void;
  onTaskSelect: (task: TaskItem) => void;
  onReorderTags: (sourceTag: string, targetTag: string) => void;
};

export type TagRenderOptions = {
  allowAppleReminderWriteback: boolean;
  orderedTags?: string[];
  sourceColors?: Partial<Record<TaskItem["source"], string>>;
};

export function renderTagsView(
  container: HTMLElement,
  tasks: TaskItem[],
  handlers: TagViewHandlers,
  t: Translator,
  options: TagRenderOptions = { allowAppleReminderWriteback: false }
): void {
  container.empty();

  const groups = sortTagGroups(buildTagGroups(tasks), options.orderedTags);
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
  card.draggable = true;
  card.setAttr("data-tag", group.tag);
  card.addEventListener("dragstart", (event: DragEvent) => {
    event.dataTransfer?.setData("text/task-hub-tag", group.tag);
    event.dataTransfer!.effectAllowed = "move";
    card.addClass("is-dragging");
  });
  card.addEventListener("dragend", () => {
    card.removeClass("is-dragging");
  });
  card.addEventListener("dragover", (event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer!.dropEffect = "move";
    card.addClass("is-drop-target");
  });
  card.addEventListener("dragleave", () => {
    card.removeClass("is-drop-target");
  });
  card.addEventListener("drop", (event: DragEvent) => {
    event.preventDefault();
    card.removeClass("is-drop-target");
    const sourceTag = event.dataTransfer?.getData("text/task-hub-tag");
    if (!sourceTag || sourceTag === group.tag) return;
    handlers.onReorderTags(sourceTag, group.tag);
  });
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
  const color = options.sourceColors?.[task.source];
  if (color) item.style.setProperty("--task-hub-source-color", color);
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
  const tags = Array.from(new Set(tasks.flatMap((task) => task.tags))).sort((left, right) => left.localeCompare(right));
  const groups = new Map<string, TaskItem[]>();
  for (const tag of tags) {
    groups.set(tag, tasks.filter((task) => task.tags.some((taskTag) => isTagMatch(taskTag, tag))));
  }

  return Array.from(groups.entries())
    .map(([tag, groupTasks]) => ({ tag, tasks: groupTasks }))
    .sort((left, right) => left.tag.localeCompare(right.tag));
}

function sortTagGroups(groups: TagGroup[], orderedTags: string[] = []): TagGroup[] {
  const rank = new Map(orderedTags.map((tag, index) => [tag, index]));
  return [...groups].sort((left, right) => {
    const leftRank = rank.get(left.tag);
    const rightRank = rank.get(right.tag);
    if (leftRank !== undefined && rightRank !== undefined) return leftRank - rightRank;
    if (leftRank !== undefined) return -1;
    if (rightRank !== undefined) return 1;
    const openDelta = right.tasks.filter((task) => !task.completed).length - left.tasks.filter((task) => !task.completed).length;
    if (openDelta !== 0) return openDelta;
    return left.tag.localeCompare(right.tag);
  });
}

function isTagMatch(taskTag: string, selectedTag: string): boolean {
  return taskTag === selectedTag || taskTag.startsWith(`${selectedTag}/`);
}
