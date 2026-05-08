import type { DateBucket } from "../calendar/dateBuckets";
import { groupTasksByDateBucket, type TaskFilterState } from "../filtering/filters";
import type { Translator } from "../i18n";
import type { TaskItem } from "../types";

export type TaskRowHandlers = {
  onComplete: (task: TaskItem) => void;
  onJump: (task: TaskItem) => void;
  onSelect: (task: TaskItem) => void;
  onDateBucketSelect: (bucket: DateBucket | undefined) => void;
  onTagSelect: (tag: string) => void;
  onSourceSelect: (source: "all" | "vault" | "apple-reminders") => void;
};

export type TaskRenderOptions = {
  allowAppleReminderWriteback: boolean;
  selectedTaskId?: string;
};

const BUCKETS = ["overdue", "today", "thisWeek", "future", "noDate"] as const;

export function renderTasksView(
  container: HTMLElement,
  tasks: TaskItem[],
  filters: TaskFilterState,
  handlers: TaskRowHandlers,
  now: Date,
  t: Translator,
  options: TaskRenderOptions = { allowAppleReminderWriteback: false }
): void {
  container.empty();

  if (tasks.length === 0) {
    const hasActiveFilter =
      filters.status !== "open" ||
      Boolean(filters.dateBucket) ||
      filters.tags.length > 0 ||
      Boolean(filters.sourceQuery) ||
      Boolean(filters.textQuery);
    container.createDiv({
      cls: "task-hub-empty",
      text: hasActiveFilter ? t("noMatchingTasks") : t("noOpenTasks")
    });
    return;
  }

  const selectedTask = tasks.find((task) => task.id === options.selectedTaskId) ?? tasks[0];
  const workbench = container.createDiv({ cls: "task-hub-task-workbench" });
  renderTaskSidebar(workbench, tasks, filters, handlers, now, t);
  const list = workbench.createDiv({ cls: "task-hub-task-list-pane" });
  const groups = groupTasksByDateBucket(tasks, now);

  for (const bucket of BUCKETS) {
    const bucketTasks = groups[bucket];
    if (bucketTasks.length === 0) continue;

    const section = list.createDiv({ cls: "task-hub-task-section" });
    section.createEl("h3", { text: `${t(bucket)} (${bucketTasks.length})` });

    for (const task of bucketTasks) {
      renderTaskRow(section, task, handlers, options, task.id === selectedTask?.id);
    }
  }
  renderTaskDetails(workbench, selectedTask, handlers, options, t);
}

function renderTaskSidebar(
  container: HTMLElement,
  tasks: TaskItem[],
  filters: TaskFilterState,
  handlers: TaskRowHandlers,
  now: Date,
  t: Translator
): void {
  const sidebar = container.createDiv({ cls: "task-hub-task-sidebar" });
  const groups = groupTasksByDateBucket(tasks, now);
  const total = tasks.length;
  sidebar.createEl("h3", { text: t("filters") });
  renderSidebarButton(sidebar, t("all"), total, !filters.dateBucket && filters.tags.length === 0 && !filters.sourceQuery, () => {
    handlers.onDateBucketSelect(undefined);
  });
  for (const bucket of BUCKETS) {
    renderSidebarButton(sidebar, t(bucket), groups[bucket].length, filters.dateBucket === bucket, () => {
      handlers.onDateBucketSelect(bucket);
    });
  }

  const tagCounts = countTags(tasks);
  if (tagCounts.length > 0) {
    sidebar.createEl("h3", { text: t("tags") });
    for (const [tag, count] of tagCounts.slice(0, 10)) {
      renderSidebarButton(sidebar, tag, count, filters.tags.includes(tag), () => handlers.onTagSelect(tag));
    }
  }

  sidebar.createEl("h3", { text: t("source") });
  renderSidebarButton(sidebar, t("all"), total, !filters.sourceQuery, () => handlers.onSourceSelect("all"));
  renderSidebarButton(sidebar, t("vaultTasks"), tasks.filter((task) => task.source === "vault").length, filters.sourceQuery === "vault", () =>
    handlers.onSourceSelect("vault")
  );
  renderSidebarButton(
    sidebar,
    "Apple Reminders",
    tasks.filter((task) => task.source === "apple-reminders").length,
    filters.sourceQuery === "apple-reminders",
    () => handlers.onSourceSelect("apple-reminders")
  );
}

function renderSidebarButton(container: HTMLElement, label: string, count: number, active: boolean, onClick: () => void): void {
  const button = container.createEl("button", { cls: `task-hub-sidebar-item ${active ? "is-active" : ""}` });
  button.createSpan({ text: label });
  button.createSpan({ cls: "task-hub-sidebar-count", text: String(count) });
  button.addEventListener("click", onClick);
}

function renderTaskRow(
  container: HTMLElement,
  task: TaskItem,
  handlers: TaskRowHandlers,
  options: TaskRenderOptions,
  selected: boolean
): void {
  const row = container.createDiv({ cls: `task-hub-task-row ${selected ? "is-selected" : ""}` });
  const checkbox = row.createEl("input", { type: "checkbox" });
  checkbox.checked = task.completed;
  checkbox.disabled = task.source !== "vault" && !(task.source === "apple-reminders" && options.allowAppleReminderWriteback);
  checkbox.addEventListener("click", (event) => {
    event.stopPropagation();
    handlers.onComplete(task);
  });

  const body = row.createDiv({ cls: "task-hub-task-body" });
  body.createDiv({ cls: "task-hub-task-text", text: task.text });

  const meta = body.createDiv({ cls: "task-hub-task-meta" });
  if (task.dueDate) meta.createSpan({ text: task.dueDate });
  if (task.tags.length > 0) meta.createSpan({ text: task.tags.join(" ") });
  meta.createSpan({ text: task.externalSourceName ?? task.filePath });

  row.addEventListener("click", () => handlers.onSelect(task));
  row.addEventListener("dblclick", () => {
    handlers.onJump(task);
  });
}

function renderTaskDetails(
  container: HTMLElement,
  task: TaskItem | undefined,
  handlers: TaskRowHandlers,
  options: TaskRenderOptions,
  t: Translator
): void {
  const details = container.createDiv({ cls: "task-hub-task-details" });
  details.createEl("h3", { text: t("taskDetails") });
  if (!task) {
    details.createDiv({ cls: "task-hub-empty", text: t("noMatchingTasks") });
    return;
  }

  details.createDiv({ cls: "task-hub-detail-title", text: task.text });
  const facts = details.createDiv({ cls: "task-hub-detail-facts" });
  facts.createDiv({ text: `${t("completed")}: ${task.completed ? t("completed") : t("open")}` });
  if (task.dueDate) facts.createDiv({ text: `${t("today")}: ${task.dueDate}` });
  if (task.tags.length > 0) facts.createDiv({ text: `${t("tags")}: ${task.tags.join(" ")}` });
  facts.createDiv({ text: `${t("source")}: ${task.externalSourceName ?? task.filePath}` });
  if (task.heading) facts.createDiv({ text: task.heading });
  if (task.contextPreview) {
    details.createEl("h4", { text: t("context") });
    details.createDiv({ cls: "task-hub-detail-context", text: task.contextPreview });
  }

  const actions = details.createDiv({ cls: "task-hub-detail-actions" });
  const canToggle = task.source === "vault" || (task.source === "apple-reminders" && options.allowAppleReminderWriteback);
  const completeButton = actions.createEl("button", { text: task.completed ? t("taskReopened") : t("taskCompleted") });
  completeButton.disabled = !canToggle;
  completeButton.addEventListener("click", () => handlers.onComplete(task));
  const openButton = actions.createEl("button", { text: t("open") });
  openButton.disabled = task.source !== "vault";
  openButton.addEventListener("click", () => handlers.onJump(task));
  if (!canToggle && task.source !== "vault") {
    details.createDiv({ cls: "task-hub-detail-note", text: t("externalTaskReadOnly") });
  }
}

function countTags(tasks: TaskItem[]): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const task of tasks) {
    for (const tag of task.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries()).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
}
