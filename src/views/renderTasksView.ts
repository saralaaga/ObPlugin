import { filterTasks, groupTasksByDateBucket, sortTasksByCompletion, type TaskFilterState } from "../filtering/filters";
import type { Translator } from "../i18n";
import type { TaskItem } from "../types";

export type TaskRowHandlers = {
  onComplete: (task: TaskItem) => void;
  onJump: (task: TaskItem) => void;
  onSendToAppleReminders: (task: TaskItem) => void;
  onSelect: (task: TaskItem) => void;
  onTagSelect: (tag: string) => void;
  onTagQueryChange: (query: string) => void;
  onSourceSelect: (source: "all" | "vault" | "apple-reminders") => void;
};

export type TaskRenderOptions = {
  allowAppleReminderCreate?: boolean;
  allowAppleReminderWriteback: boolean;
  selectedTaskId?: string;
  sourceColors?: Partial<Record<TaskItem["source"], string>>;
  taskListScrollTop?: number;
  tagQuery?: string;
};

const BUCKETS = ["overdue", "today", "thisWeek", "future", "noDate"] as const;

export function renderTasksView(
  container: HTMLElement,
  tasks: TaskItem[],
  allTasks: TaskItem[],
  filters: TaskFilterState,
  handlers: TaskRowHandlers,
  now: Date,
  t: Translator,
  options: TaskRenderOptions = { allowAppleReminderWriteback: false }
): void {
  container.empty();

  const hasActiveFilter =
    filters.status !== "open" ||
    Boolean(filters.dateBucket) ||
    filters.tags.length > 0 ||
    Boolean(filters.sourceQuery) ||
    Boolean(filters.textQuery);

  if (tasks.length === 0 && !hasActiveFilter) {
    container.createDiv({
      cls: "task-hub-empty",
      text: t("noOpenTasks")
    });
    return;
  }

  const sortedTasks = sortTasksByCompletion(tasks);
  const selectedTask = sortedTasks.find((task) => task.id === options.selectedTaskId) ?? sortedTasks[0];
  const workbench = container.createDiv({ cls: "task-hub-task-workbench" });
  renderTaskSidebar(workbench, allTasks, filters, handlers, now, t);
  const list = workbench.createDiv({ cls: "task-hub-task-list-pane" });

  if (sortedTasks.length === 0) {
    list.createDiv({ cls: "task-hub-empty", text: t("noMatchingTasks") });
    restoreTaskListScroll(list, options);
    return;
  }

  const groups = groupTasksByDateBucket(sortedTasks, now);

  for (const bucket of BUCKETS) {
    const bucketTasks = groups[bucket];
    if (bucketTasks.length === 0) continue;

    const section = list.createDiv({ cls: "task-hub-task-section" });
    section.createEl("h3", { text: `${t(bucket)} (${bucketTasks.length})` });
    const cards = section.createDiv({ cls: "task-hub-task-card-flow" });

    for (const task of bucketTasks) {
      renderTaskRow(cards, task, handlers, options, task.id === selectedTask?.id);
    }
  }
  restoreTaskListScroll(list, options);
  renderTaskDetails(workbench, selectedTask, handlers, options, t);
}

function restoreTaskListScroll(list: HTMLElement, options: TaskRenderOptions): void {
  if (options.taskListScrollTop !== undefined) {
    list.scrollTop = options.taskListScrollTop;
  }
}

function renderTaskSidebar(
  container: HTMLElement,
  allTasks: TaskItem[],
  filters: TaskFilterState,
  handlers: TaskRowHandlers,
  now: Date,
  t: Translator
): void {
  const sidebar = container.createDiv({ cls: "task-hub-task-sidebar" });
  const sourceCountTasks = filterTasks(allTasks, { ...filters, sourceQuery: "" }, now);
  const total = sourceCountTasks.length;
  sidebar.createEl("h3", { text: t("filters") });
  renderSidebarButton(sidebar, t("all"), total, !filters.sourceQuery, () => handlers.onSourceSelect("all"));
  renderSidebarButton(
    sidebar,
    t("vaultTasks"),
    sourceCountTasks.filter((task) => task.source === "vault").length,
    filters.sourceQuery === "vault",
    () => handlers.onSourceSelect("vault")
  );
  renderSidebarButton(
    sidebar,
    "Apple Reminders",
    sourceCountTasks.filter((task) => task.source === "apple-reminders").length,
    filters.sourceQuery === "apple-reminders",
    () => handlers.onSourceSelect("apple-reminders")
  );
  const tagCountTasks = filterTasks(allTasks, { ...filters, tags: [], tagQuery: undefined }, now);
  renderTagFilter(sidebar, tagCountTasks, filters, handlers, t);
}

function renderTagFilter(
  container: HTMLElement,
  allTasks: TaskItem[],
  filters: TaskFilterState,
  handlers: TaskRowHandlers,
  t: Translator
): void {
  const tagCounts = countTags(allTasks);
  container.createEl("h3", { text: t("tags") });
  const panel = container.createDiv({ cls: "task-hub-sidebar-tag-panel" });
  const search = panel.createEl("input", {
    cls: "task-hub-sidebar-tag-search",
    attr: { placeholder: t("searchTags") },
    type: "search",
    value: filters.tagQuery ?? ""
  });
  search.addEventListener("input", () => {
    handlers.onTagQueryChange(search.value);
  });
  const query = (filters.tagQuery ?? "").trim().toLowerCase();
  const visibleTags = query ? tagCounts.filter(([tag]) => tag.toLowerCase().includes(query)) : tagCounts;
  const list = panel.createDiv({ cls: "task-hub-sidebar-tag-options" });
  if (visibleTags.length === 0) {
    list.createDiv({ cls: "task-hub-sidebar-tag-empty", text: t("noTags") });
    return;
  }
  for (const group of buildTagGroups(visibleTags)) {
    const hasChildren = group.children.length > 0;
    const rootSelected = filters.tags.includes(group.root);
    const childSelected = group.children.some((child) => filters.tags.includes(child.tag));
    const rootMatchesQuery = query && group.root.toLowerCase().includes(query);
    if (!hasChildren) {
      renderTagCheckbox(list, group.root, group.directCount, rootSelected, handlers);
      continue;
    }

    const details = list.createEl("details", { cls: `task-hub-sidebar-tag-group ${rootSelected || childSelected ? "is-active" : ""}` });
    details.open = Boolean(rootSelected || childSelected || rootMatchesQuery || query);
    const summary = details.createEl("summary", { cls: "task-hub-sidebar-tag-summary" });
    renderTagCheckbox(summary, group.root, group.totalCount, rootSelected, handlers, "task-hub-sidebar-tag-option is-group-root");

    for (const child of group.children) {
      renderTagCheckbox(details, child.tag, child.count, filters.tags.includes(child.tag), handlers, "task-hub-sidebar-tag-option is-child");
    }
  }
}

function renderTagCheckbox(
  container: HTMLElement,
  tag: string,
  count: number,
  active: boolean,
  handlers: TaskRowHandlers,
  cls = "task-hub-sidebar-tag-option"
): void {
  const option = container.createEl("label", { cls: `${cls} ${active ? "is-active" : ""}` });
  const checkbox = option.createEl("input", { type: "checkbox" });
  checkbox.checked = active;
  checkbox.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  checkbox.addEventListener("change", () => handlers.onTagSelect(tag));
  option.createSpan({ text: tag });
  option.createSpan({ cls: "task-hub-sidebar-count", text: String(count) });
}

function renderSidebarButton(
  container: HTMLElement,
  label: string,
  count: number,
  active: boolean,
  onClick: () => void
): void {
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
  const classes = ["task-hub-task-row", selected ? "is-selected" : "", task.completed ? "is-completed" : ""].filter(Boolean).join(" ");
  const row = container.createDiv({ cls: classes });
  const color = options.sourceColors?.[task.source];
  if (color) row.style.setProperty("--task-hub-source-color", color);
  const checkbox = row.createEl("input", { type: "checkbox" });
  checkbox.checked = task.completed;
  checkbox.disabled = task.source !== "vault" && !(task.source === "apple-reminders" && options.allowAppleReminderWriteback);
  checkbox.addEventListener("click", (event) => {
    event.stopPropagation();
    handlers.onComplete(task);
  });

  const body = row.createDiv({ cls: "task-hub-task-body" });
  body.createDiv({ cls: "task-hub-task-text", text: renderPlainTaskText(task.text) });

  const meta = body.createDiv({ cls: "task-hub-task-meta" });
  if (task.dueDate) meta.createSpan({ text: task.dueDate });
  for (const tag of task.tags) {
    meta.createSpan({ cls: "task-hub-task-tag", text: tag });
  }
  meta.createSpan({ cls: "task-hub-task-source", text: task.externalSourceName ?? task.filePath });

  row.addEventListener("click", () => handlers.onSelect(task));
  row.addEventListener("dblclick", () => {
    handlers.onJump(task);
  });
}

function renderPlainTaskText(text: string): string {
  return text.replace(/\\([\\`*_[\]{}()#+\-.!|>])/g, "$1");
}

function renderTaskDetails(
  container: HTMLElement,
  task: TaskItem | undefined,
  handlers: TaskRowHandlers,
  options: TaskRenderOptions,
  t: Translator
): void {
  const details = container.createDiv({ cls: `task-hub-task-details ${task?.completed ? "is-completed" : ""}` });
  details.createEl("h3", { text: t("taskDetails") });
  if (!task) {
    details.createDiv({ cls: "task-hub-empty", text: t("noMatchingTasks") });
    return;
  }

  details.createDiv({ cls: `task-hub-detail-title ${task.completed ? "is-completed" : ""}`, text: task.text });
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
  const completeButton = actions.createEl("button", { text: task.completed ? t("markOpen") : t("markComplete") });
  completeButton.disabled = !canToggle;
  completeButton.addEventListener("click", () => handlers.onComplete(task));
  const openButton = actions.createEl("button", { text: t("openSource") });
  openButton.disabled = task.source !== "vault";
  openButton.addEventListener("click", () => handlers.onJump(task));
  if (task.source === "vault" && options.allowAppleReminderCreate) {
    const sendButton = actions.createEl("button", { text: t("sendToAppleReminders") });
    sendButton.addEventListener("click", () => handlers.onSendToAppleReminders(task));
  }
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

type TagGroup = {
  root: string;
  directCount: number;
  totalCount: number;
  children: Array<{ tag: string; count: number }>;
};

function buildTagGroups(tagCounts: Array<[string, number]>): TagGroup[] {
  const groups = new Map<string, TagGroup>();
  for (const [tag, count] of tagCounts) {
    const root = getRootTag(tag);
    const group = groups.get(root) ?? { root, directCount: 0, totalCount: 0, children: [] };
    group.totalCount += count;
    if (tag === root) {
      group.directCount += count;
    } else {
      group.children.push({ tag, count });
    }
    groups.set(root, group);
  }

  return Array.from(groups.values()).sort((left, right) => {
    if (right.totalCount !== left.totalCount) return right.totalCount - left.totalCount;
    return left.root.localeCompare(right.root);
  });
}

function getRootTag(tag: string): string {
  const slashIndex = tag.indexOf("/");
  return slashIndex === -1 ? tag : tag.slice(0, slashIndex);
}
