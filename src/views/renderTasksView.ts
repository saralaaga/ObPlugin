import { groupTasksByDateBucket, type TaskFilterState } from "../filtering/filters";
import type { TaskItem } from "../types";

export type TaskRowHandlers = {
  onComplete: (task: TaskItem) => void;
  onJump: (task: TaskItem) => void;
};

const BUCKET_LABELS = {
  overdue: "Overdue",
  today: "Today",
  thisWeek: "This week",
  future: "Future",
  noDate: "No date"
};

export function renderTasksView(
  container: HTMLElement,
  tasks: TaskItem[],
  filters: TaskFilterState,
  handlers: TaskRowHandlers,
  now: Date
): void {
  container.empty();

  if (tasks.length === 0) {
    container.createDiv({ cls: "task-hub-empty", text: "No tasks match the current filters." });
    return;
  }

  const groups = groupTasksByDateBucket(tasks, now);

  for (const [bucket, label] of Object.entries(BUCKET_LABELS)) {
    const bucketTasks = groups[bucket as keyof typeof groups];
    if (bucketTasks.length === 0) continue;

    const section = container.createDiv({ cls: "task-hub-task-section" });
    section.createEl("h3", { text: `${label} (${bucketTasks.length})` });

    for (const task of bucketTasks) {
      renderTaskRow(section, task, handlers);
    }
  }
}

function renderTaskRow(container: HTMLElement, task: TaskItem, handlers: TaskRowHandlers): void {
  const row = container.createDiv({ cls: "task-hub-task-row" });
  const checkbox = row.createEl("input", { type: "checkbox" });
  checkbox.checked = task.completed;
  checkbox.addEventListener("click", (event) => {
    event.stopPropagation();
    handlers.onComplete(task);
  });

  const body = row.createDiv({ cls: "task-hub-task-body" });
  body.createDiv({ cls: "task-hub-task-text", text: task.text });

  const meta = body.createDiv({ cls: "task-hub-task-meta" });
  if (task.dueDate) meta.createSpan({ text: task.dueDate });
  if (task.tags.length > 0) meta.createSpan({ text: task.tags.join(" ") });
  meta.createSpan({ text: task.filePath });

  row.addEventListener("click", () => {
    handlers.onJump(task);
  });
}
