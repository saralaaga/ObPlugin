import { parseTasksFromMarkdown } from "./taskParser";

describe("parseTasksFromMarkdown", () => {
  it("extracts open tasks with tags and emoji due dates", () => {
    const tasks = parseTasksFromMarkdown({
      filePath: "Projects/Acme.md",
      content: "# Acme\n\n- [ ] Write proposal #client/acme 📅 2026-05-10"
    });

    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      filePath: "Projects/Acme.md",
      line: 2,
      completed: false,
      text: "Write proposal",
      tags: ["#client/acme"],
      dueDate: "2026-05-10",
      heading: "Acme"
    });
  });

  it("extracts completed tasks with due:: dates", () => {
    const tasks = parseTasksFromMarkdown({
      filePath: "Inbox.md",
      content: "- [x] Send invoice #finance due:: 2026-05-11"
    });

    expect(tasks[0]).toMatchObject({
      completed: true,
      text: "Send invoice",
      tags: ["#finance"],
      dueDate: "2026-05-11"
    });
  });

  it("ignores non-task checkboxes and malformed dates", () => {
    const tasks = parseTasksFromMarkdown({
      filePath: "Inbox.md",
      content: "- [?] Maybe\n- [ ] Keep this 📅 tomorrow"
    });

    expect(tasks).toHaveLength(1);
    expect(tasks[0].dueDate).toBeUndefined();
  });
});
