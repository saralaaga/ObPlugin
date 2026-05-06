import { getTaskDateBucket } from "../calendar/dateBuckets";
import type { TaskItem } from "../types";

export type TagStat = {
  tag: string;
  total: number;
  open: number;
  overdue: number;
  thisWeek: number;
};

export function buildTagStats(tasks: TaskItem[], now: Date): TagStat[] {
  const statsByTag = new Map<string, TagStat>();

  for (const task of tasks) {
    for (const tag of task.tags) {
      const stat = statsByTag.get(tag) ?? {
        tag,
        total: 0,
        open: 0,
        overdue: 0,
        thisWeek: 0
      };

      stat.total += 1;
      if (!task.completed) {
        stat.open += 1;
        const bucket = getTaskDateBucket(task.dueDate, now);
        if (bucket === "overdue") stat.overdue += 1;
        if (bucket === "thisWeek") stat.thisWeek += 1;
      }

      statsByTag.set(tag, stat);
    }
  }

  return Array.from(statsByTag.values()).sort((left, right) => {
    if (right.open !== left.open) return right.open - left.open;
    return left.tag.localeCompare(right.tag);
  });
}
