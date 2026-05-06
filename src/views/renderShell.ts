import type { DateBucket } from "../calendar/dateBuckets";
import { type TaskFilterState } from "../filtering/filters";
import type { TaskIndexStats } from "../indexing/taskIndex";

export type DashboardView = "tasks" | "calendar" | "tags";

export type ShellState = {
  view: DashboardView;
  filters: TaskFilterState;
  availableTags: string[];
  stats: TaskIndexStats;
};

export type ShellHandlers = {
  onViewChange: (view: DashboardView) => void;
  onRescan: () => void;
  onStatusChange: (status: TaskFilterState["status"]) => void;
  onDateBucketChange: (bucket: DateBucket | undefined) => void;
  onTagToggle: (tag: string) => void;
  onSourceQueryChange: (query: string) => void;
  onTextQueryChange: (query: string) => void;
};

const DATE_OPTIONS: Array<{ label: string; value: DateBucket | "" }> = [
  { label: "Any date", value: "" },
  { label: "Overdue", value: "overdue" },
  { label: "Today", value: "today" },
  { label: "This week", value: "thisWeek" },
  { label: "Future", value: "future" },
  { label: "No date", value: "noDate" }
];

export function renderShell(container: HTMLElement, state: ShellState, handlers: ShellHandlers): HTMLElement {
  container.empty();
  const root = container.createDiv({ cls: "task-hub-root" });

  const topBar = root.createDiv({ cls: "task-hub-topbar" });
  const title = topBar.createDiv({ cls: "task-hub-title" });
  title.createEl("h2", { text: "Task Hub" });
  title.createEl("p", {
    text: `${state.stats.taskCount} tasks indexed. ${state.stats.indexed} changed, ${state.stats.skipped} skipped, ${state.stats.failed} failed.${state.stats.lastScanAt ? ` Last scan: ${state.stats.lastScanAt}` : ""}`
  });

  const viewSwitch = topBar.createDiv({ cls: "task-hub-view-switch" });
  for (const view of ["tasks", "calendar", "tags"] as DashboardView[]) {
    const button = viewSwitch.createEl("button", {
      cls: state.view === view ? "mod-cta" : "",
      text: view[0].toUpperCase() + view.slice(1)
    });
    button.addEventListener("click", () => handlers.onViewChange(view));
  }

  const rescan = topBar.createEl("button", { text: "Rescan" });
  rescan.addEventListener("click", handlers.onRescan);

  const layout = root.createDiv({ cls: "task-hub-layout" });
  const sidebar = layout.createDiv({ cls: "task-hub-sidebar" });
  const main = layout.createDiv({ cls: "task-hub-main" });

  renderFilters(sidebar, state, handlers);

  return main;
}

function renderFilters(container: HTMLElement, state: ShellState, handlers: ShellHandlers): void {
  container.createEl("h3", { text: "Filters" });

  const status = container.createEl("select");
  for (const [value, label] of [
    ["open", "Open"],
    ["completed", "Completed"],
    ["all", "All"]
  ] as const) {
    const option = status.createEl("option", { text: label, value });
    option.selected = state.filters.status === value;
  }
  status.addEventListener("change", () => {
    handlers.onStatusChange(status.value as TaskFilterState["status"]);
  });

  const date = container.createEl("select");
  for (const optionDefinition of DATE_OPTIONS) {
    const option = date.createEl("option", { text: optionDefinition.label, value: optionDefinition.value });
    option.selected = (state.filters.dateBucket ?? "") === optionDefinition.value;
  }
  date.addEventListener("change", () => {
    handlers.onDateBucketChange(date.value === "" ? undefined : (date.value as DateBucket));
  });

  const source = container.createEl("input", {
    attr: { placeholder: "Folder or file" },
    type: "search",
    value: state.filters.sourceQuery
  });
  source.addEventListener("input", () => handlers.onSourceQueryChange(source.value));

  const text = container.createEl("input", {
    attr: { placeholder: "Search tasks" },
    type: "search",
    value: state.filters.textQuery
  });
  text.addEventListener("input", () => handlers.onTextQueryChange(text.value));

  const tagList = container.createDiv({ cls: "task-hub-tag-list" });
  for (const tag of state.availableTags) {
    const button = tagList.createEl("button", {
      cls: state.filters.tags.includes(tag) ? "mod-cta" : "",
      text: tag
    });
    button.addEventListener("click", () => handlers.onTagToggle(tag));
  }
}
