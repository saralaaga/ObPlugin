import { getTaskDateBucket, type DateBucket } from "../calendar/dateBuckets";
import type { TaskItem, TaskStatusFilter } from "../types";

export type TaskFilterState = {
  status: TaskStatusFilter;
  dateBucket?: DateBucket;
  tags: string[];
  sourceQuery: string;
  textQuery: string;
};

export function filterTasks(tasks: TaskItem[], filters: TaskFilterState, now: Date): TaskItem[] {
  const sourceQuery = filters.sourceQuery.toLowerCase();
  const textQuery = filters.textQuery.toLowerCase();

  return tasks.filter((task) => {
    if (filters.status === "open" && task.completed) return false;
    if (filters.status === "completed" && !task.completed) return false;
    if (filters.dateBucket && getTaskDateBucket(task.dueDate, now) !== filters.dateBucket) return false;
    if (filters.tags.length > 0 && !filters.tags.every((tag) => task.tags.includes(tag))) return false;
    if (sourceQuery && !task.filePath.toLowerCase().includes(sourceQuery)) return false;
    if (textQuery && !task.text.toLowerCase().includes(textQuery)) return false;
    return true;
  });
}

export function groupTasksByDateBucket(tasks: TaskItem[], now: Date): Record<DateBucket, TaskItem[]> {
  return tasks.reduce<Record<DateBucket, TaskItem[]>>(
    (groups, task) => {
      groups[getTaskDateBucket(task.dueDate, now)].push(task);
      return groups;
    },
    { overdue: [], today: [], thisWeek: [], future: [], noDate: [] }
  );
}
