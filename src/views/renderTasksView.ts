import { groupTasksByDateBucket, type TaskFilterState } from "../filtering/filters";
import type { Translator } from "../i18n";
import type { TaskItem } from "../types";

export type TaskRowHandlers = {
  onComplete: (task: TaskItem) => void;
  onJump: (task: TaskItem) => void;
};

export type TaskRenderOptions = {
  allowAppleReminderWriteback: boolean;
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

  const groups = groupTasksByDateBucket(tasks, now);

  for (const bucket of BUCKETS) {
    const bucketTasks = groups[bucket];
    if (bucketTasks.length === 0) continue;

    const section = container.createDiv({ cls: "task-hub-task-section" });
    section.createEl("h3", { text: `${t(bucket)} (${bucketTasks.length})` });

    for (const task of bucketTasks) {
      renderTaskRow(section, task, handlers, options);
    }
  }
}

function renderTaskRow(container: HTMLElement, task: TaskItem, handlers: TaskRowHandlers, options: TaskRenderOptions): void {
  const row = container.createDiv({ cls: "task-hub-task-row" });
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

  row.addEventListener("click", () => {
    handlers.onJump(task);
  });
}
