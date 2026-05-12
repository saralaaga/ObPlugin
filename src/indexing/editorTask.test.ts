import { parseTaskAtLine } from "./editorTask";

describe("parseTaskAtLine", () => {
  it("parses the current Markdown task line into a vault task", () => {
    const task = parseTaskAtLine({
      filePath: "Projects/Acme.md",
      content: "# Acme\n\n- [ ] Send proposal #client/acme 📅 2026-05-20",
      line: 2
    });

    expect(task).toMatchObject({
      filePath: "Projects/Acme.md",
      line: 2,
      rawLine: "- [ ] Send proposal #client/acme 📅 2026-05-20",
      text: "Send proposal",
      tags: ["#client/acme"],
      dueDate: "2026-05-20",
      source: "vault"
    });
  });

  it("returns undefined when the current line is not a task", () => {
    expect(
      parseTaskAtLine({
        filePath: "Inbox.md",
        content: "# Inbox\nPlain text",
        line: 1
      })
    ).toBeUndefined();
  });
});
