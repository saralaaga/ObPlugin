import { setIcon } from "obsidian";
import { type TaskFilterState } from "../filtering/filters";
import type { Translator } from "../i18n";
import type { TaskIndexStats } from "../indexing/taskIndex";

export type DashboardView = "tasks" | "calendar" | "tags";

export type ShellState = {
  view: DashboardView;
  filters: TaskFilterState;
  availableTags: string[];
  stats: TaskIndexStats;
  t: Translator;
};

export type ShellHandlers = {
  onViewChange: (view: DashboardView) => void;
  onRescan: () => void;
  onStatusChange: (status: TaskFilterState["status"]) => void;
  onTextQueryChange: (query: string) => void;
};

export function renderShell(container: HTMLElement, state: ShellState, handlers: ShellHandlers): HTMLElement {
  container.empty();
  const root = container.createDiv({ cls: "task-hub-root" });

  const topBar = root.createDiv({ cls: "task-hub-header" });
  const title = topBar.createDiv({ cls: "task-hub-title" });
  title.createEl("h2", { text: state.t("taskHub") });
  title.createEl("p", {
    text: `${state.stats.taskCount} ${state.t("tasksIndexed")}. ${state.stats.indexed} ${state.t("changed")}, ${state.stats.skipped} ${state.t("skipped")}, ${state.stats.failed} ${state.t("failed")}.${state.stats.lastScanAt ? ` ${state.t("lastScan")}: ${state.stats.lastScanAt}` : ""}`
  });

  const toolbar = root.createDiv({ cls: "task-hub-toolbar" });
  const viewSwitch = toolbar.createDiv({ cls: "task-hub-view-switch" });
  for (const view of ["tasks", "calendar", "tags"] as DashboardView[]) {
    const button = viewSwitch.createEl("button", {
      cls: state.view === view ? "mod-cta" : "",
      text: state.t(view)
    });
    button.addEventListener("click", () => handlers.onViewChange(view));
  }

  renderFilters(toolbar, state, handlers);

  const rescan = toolbar.createEl("button", { cls: "task-hub-icon-button" });
  rescan.setAttr("aria-label", state.t("rescan"));
  rescan.setAttr("title", state.t("rescan"));
  setIcon(rescan, "refresh-cw");
  rescan.addEventListener("click", handlers.onRescan);

  const main = root.createDiv({ cls: "task-hub-main" });
  return main;
}

function renderFilters(container: HTMLElement, state: ShellState, handlers: ShellHandlers): void {
  const filters = container.createDiv({ cls: "task-hub-filter-strip" });

  const showCompleted = filters.createEl("label", { cls: "task-hub-completed-toggle" });
  const showCompletedCheckbox = showCompleted.createEl("input", { type: "checkbox" });
  showCompletedCheckbox.checked = state.filters.status !== "open";
  showCompletedCheckbox.addEventListener("change", () => {
    handlers.onStatusChange(showCompletedCheckbox.checked ? "all" : "open");
  });
  showCompleted.createSpan({ text: state.t("showCompletedInView") });

  const text = filters.createEl("input", {
    cls: "task-hub-filter-control is-wide",
    attr: { placeholder: state.t("searchTasks") },
    type: "search",
    value: state.filters.textQuery
  });
  text.addEventListener("input", () => handlers.onTextQueryChange(text.value));
}
