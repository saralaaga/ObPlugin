import { filterTasks, groupTasksByDateBucket, type TaskFilterState } from "./filters";
import type { TaskItem } from "../types";

const NOW = new Date("2026-05-06T09:00:00");

const TASKS: TaskItem[] = [
  task({ id: "overdue", text: "Call supplier", dueDate: "2026-05-01", tags: ["#work"], filePath: "Work/Suppliers.md" }),
  task({ id: "today", text: "Write proposal", dueDate: "2026-05-06", tags: ["#work", "#client/acme"], filePath: "Projects/Acme.md" }),
  task({ id: "week", text: "Review calendar", dueDate: "2026-05-10", tags: ["#review"], filePath: "Reviews/Weekly.md" }),
  task({ id: "future", text: "Renew license", dueDate: "2026-06-01", tags: ["#admin"], filePath: "Admin/Licenses.md" }),
  task({ id: "nodate", text: "Collect ideas", tags: ["#inbox"], filePath: "Inbox.md" }),
  task({ id: "done", text: "Paid invoice", completed: true, dueDate: "2026-05-06", tags: ["#finance"], filePath: "Finance.md" })
];

const BASE_FILTERS: TaskFilterState = {
  status: "open",
  tags: [],
  sourceQuery: "",
  textQuery: ""
};

describe("filterTasks", () => {
  it("hides completed tasks by default", () => {
    const results = filterTasks(TASKS, BASE_FILTERS, NOW);

    expect(results.map((item) => item.id)).not.toContain("done");
  });

  it("can show only completed tasks", () => {
    const results = filterTasks(TASKS, { ...BASE_FILTERS, status: "completed" }, NOW);

    expect(results.map((item) => item.id)).toEqual(["done"]);
  });

  it("filters by date bucket", () => {
    const results = filterTasks(TASKS, { ...BASE_FILTERS, dateBucket: "thisWeek" }, NOW);

    expect(results.map((item) => item.id)).toEqual(["week"]);
  });

  it("filters by all selected tags", () => {
    const results = filterTasks(TASKS, { ...BASE_FILTERS, tags: ["#work", "#client/acme"] }, NOW);

    expect(results.map((item) => item.id)).toEqual(["today"]);
  });

  it("filters by source and text query case-insensitively", () => {
    const results = filterTasks(TASKS, { ...BASE_FILTERS, sourceQuery: "projects", textQuery: "PROPOSAL" }, NOW);

    expect(results.map((item) => item.id)).toEqual(["today"]);
  });
});

describe("groupTasksByDateBucket", () => {
  it("groups tasks into stable dashboard buckets", () => {
    const groups = groupTasksByDateBucket(TASKS.filter((taskItem) => !taskItem.completed), NOW);

    expect(groups.overdue.map((item) => item.id)).toEqual(["overdue"]);
    expect(groups.today.map((item) => item.id)).toEqual(["today"]);
    expect(groups.thisWeek.map((item) => item.id)).toEqual(["week"]);
    expect(groups.future.map((item) => item.id)).toEqual(["future"]);
    expect(groups.noDate.map((item) => item.id)).toEqual(["nodate"]);
  });
});

function task(overrides: Partial<TaskItem>): TaskItem {
  return {
    id: overrides.id ?? "task",
    filePath: overrides.filePath ?? "Inbox.md",
    line: 0,
    rawLine: "- [ ] Task",
    text: overrides.text ?? "Task",
    completed: overrides.completed ?? false,
    tags: overrides.tags ?? [],
    dueDate: overrides.dueDate,
    heading: overrides.heading,
    contextPreview: overrides.contextPreview,
    source: "vault"
  };
}
