import type { TagStat } from "../filtering/tagStats";
import type { Translator } from "../i18n";

export type TagViewHandlers = {
  onTagSelect: (tag: string) => void;
};

export function renderTagsView(container: HTMLElement, stats: TagStat[], handlers: TagViewHandlers, t: Translator): void {
  container.empty();

  if (stats.length === 0) {
    container.createDiv({ cls: "task-hub-empty", text: t("noTags") });
    return;
  }

  const grid = container.createDiv({ cls: "task-hub-tag-grid" });
  for (const stat of stats) {
    const card = grid.createEl("button", { cls: "task-hub-tag-card" });
    card.createDiv({ cls: "task-hub-tag-name", text: stat.tag });
    const metrics = card.createDiv({ cls: "task-hub-tag-metrics" });
    metrics.createSpan({ text: `${stat.open} ${t("open")}` });
    metrics.createSpan({ text: `${stat.overdue} ${t("overdue")}` });
    metrics.createSpan({ text: `${stat.thisWeek} ${t("thisWeek")}` });
    metrics.createSpan({ text: `${stat.total} ${t("all")}` });
    card.addEventListener("click", () => handlers.onTagSelect(stat.tag));
  }
}
