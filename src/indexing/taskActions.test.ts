import { completeTaskInContent } from "./taskActions";
import type { TaskItem } from "../types";

describe("completeTaskInContent", () => {
  it("updates the direct indexed line when it still matches", () => {
    const task = taskItem({ line: 1, rawLine: "- [ ] Pay invoice #finance" });
    const result = completeTaskInContent("Intro\n- [ ] Pay invoice #finance\nOutro", task);

    expect(result).toEqual({
      status: "updated",
      content: "Intro\n- [x] Pay invoice #finance\nOutro",
      line: 1
    });
  });

  it("finds the same task near the indexed line when lines drift", () => {
    const task = taskItem({ line: 1, rawLine: "- [ ] Pay invoice #finance" });
    const result = completeTaskInContent("New intro\nIntro\n- [ ] Pay invoice #finance\nOutro", task);

    expect(result).toEqual({
      status: "updated",
      content: "New intro\nIntro\n- [x] Pay invoice #finance\nOutro",
      line: 2
    });
  });

  it("treats an already completed direct line as a no-op", () => {
    const task = taskItem({ line: 0, rawLine: "- [x] Pay invoice #finance", completed: true });
    const result = completeTaskInContent("- [x] Pay invoice #finance", task);

    expect(result).toEqual({ status: "already_completed" });
  });

  it("returns a conflict instead of changing a different task", () => {
    const task = taskItem({ line: 0, rawLine: "- [ ] Pay invoice #finance" });
    const result = completeTaskInContent("- [ ] Call supplier #work", task);

    expect(result.status).toBe("conflict");
  });
});

function taskItem(overrides: Partial<TaskItem>): TaskItem {
  return {
    id: "Finance.md:0:abc",
    filePath: "Finance.md",
    line: overrides.line ?? 0,
    rawLine: overrides.rawLine ?? "- [ ] Pay invoice",
    text: overrides.text ?? "Pay invoice",
    completed: overrides.completed ?? false,
    tags: overrides.tags ?? ["#finance"],
    dueDate: overrides.dueDate,
    heading: overrides.heading,
    contextPreview: overrides.contextPreview,
    source: "vault"
  };
}
