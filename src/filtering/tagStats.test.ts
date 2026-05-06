import { buildTagStats } from "./tagStats";
import type { TaskItem } from "../types";

const NOW = new Date("2026-05-06T09:00:00");

describe("buildTagStats", () => {
  it("counts total, open, overdue, and this-week tasks per tag", () => {
    const stats = buildTagStats(
      [
        task({ id: "1", tags: ["#work"], dueDate: "2026-05-01" }),
        task({ id: "2", tags: ["#work", "#client/acme"], dueDate: "2026-05-06" }),
        task({ id: "3", tags: ["#work"], dueDate: "2026-05-10" }),
        task({ id: "4", tags: ["#work"], completed: true, dueDate: "2026-05-10" }),
        task({ id: "5", tags: ["#misc"] })
      ],
      NOW
    );

    expect(stats.find((stat) => stat.tag === "#work")).toEqual({
      tag: "#work",
      total: 4,
      open: 3,
      overdue: 1,
      thisWeek: 1
    });
    expect(stats.find((stat) => stat.tag === "#client/acme")).toMatchObject({
      tag: "#client/acme",
      total: 1,
      open: 1
    });
  });

  it("sorts by open task count, then tag name", () => {
    const stats = buildTagStats(
      [
        task({ id: "1", tags: ["#b"] }),
        task({ id: "2", tags: ["#a"] }),
        task({ id: "3", tags: ["#b"] })
      ],
      NOW
    );

    expect(stats.map((stat) => stat.tag)).toEqual(["#b", "#a"]);
  });
});

function task(overrides: Partial<TaskItem>): TaskItem {
  return {
    id: overrides.id ?? "task",
    filePath: "Inbox.md",
    line: 0,
    rawLine: "- [ ] Task",
    text: "Task",
    completed: overrides.completed ?? false,
    tags: overrides.tags ?? [],
    dueDate: overrides.dueDate,
    source: "vault"
  };
}
