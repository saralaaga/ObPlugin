import type { TagStat } from "../filtering/tagStats";

export type TagViewHandlers = {
  onTagSelect: (tag: string) => void;
};

export function renderTagsView(container: HTMLElement, stats: TagStat[], handlers: TagViewHandlers): void {
  container.empty();

  if (stats.length === 0) {
    container.createDiv({ cls: "task-hub-empty", text: "No tags found in indexed tasks." });
    return;
  }

  const grid = container.createDiv({ cls: "task-hub-tag-grid" });
  for (const stat of stats) {
    const card = grid.createEl("button", { cls: "task-hub-tag-card" });
    card.createDiv({ cls: "task-hub-tag-name", text: stat.tag });
    const metrics = card.createDiv({ cls: "task-hub-tag-metrics" });
    metrics.createSpan({ text: `${stat.open} open` });
    metrics.createSpan({ text: `${stat.overdue} overdue` });
    metrics.createSpan({ text: `${stat.thisWeek} this week` });
    metrics.createSpan({ text: `${stat.total} total` });
    card.addEventListener("click", () => handlers.onTagSelect(stat.tag));
  }
}
