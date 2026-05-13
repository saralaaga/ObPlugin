import { TaskIndex, type IndexableFile } from "./taskIndex";

describe("TaskIndex", () => {
  it("skips unchanged files based on mtime and size", async () => {
    const reads: string[] = [];
    const index = new TaskIndex({
      ignoredPaths: [],
      readFile: (file) => {
        reads.push(file.path);
        return "- [ ] First task";
      }
    });

    const file = markdownFile({ path: "Inbox.md", mtime: 1, size: 16 });
    await index.scanFiles([file]);
    await index.scanFiles([file]);

    expect(reads).toEqual(["Inbox.md"]);
    expect(index.getTasks()).toHaveLength(1);
  });

  it("replaces tasks when a file changes", async () => {
    const contents = ["- [ ] First task", "- [ ] Second task #next"];
    const index = new TaskIndex({
      ignoredPaths: [],
      readFile: () => contents.shift() ?? ""
    });

    await index.scanFiles([markdownFile({ path: "Inbox.md", mtime: 1, size: 16 })]);
    await index.scanFiles([markdownFile({ path: "Inbox.md", mtime: 2, size: 24 })]);

    expect(index.getTasks().map((task) => task.text)).toEqual(["Second task"]);
    expect(index.getTasks()[0].tags).toEqual(["#next"]);
  });

  it("adds file-level tags to indexed tasks", async () => {
    const index = new TaskIndex({
      ignoredPaths: [],
      readFile: () => "- [ ] Draft outline #inline",
      readFileTags: () => ["#project", "#inline"]
    });

    await index.scanFiles([markdownFile({ path: "Project.md" })]);

    expect(index.getTasks()[0].tags).toEqual(["#inline", "#project"]);
  });

  it("removes tasks for deleted files", async () => {
    const index = new TaskIndex({
      ignoredPaths: [],
      readFile: () => "- [ ] Task"
    });

    await index.scanFiles([markdownFile({ path: "Inbox.md" })]);
    index.removeFile("Inbox.md");

    expect(index.getTasks()).toEqual([]);
    expect(index.getFileState("Inbox.md")).toBeUndefined();
  });

  it("skips ignored paths", async () => {
    const index = new TaskIndex({
      ignoredPaths: ["Archive/"],
      readFile: () => "- [ ] Archived task"
    });

    await index.scanFiles([markdownFile({ path: "Archive/Old.md" })]);

    expect(index.getTasks()).toEqual([]);
    expect(index.getStats().skipped).toBe(1);
  });

  it("records failed files without stopping other files", async () => {
    const index = new TaskIndex({
      ignoredPaths: [],
      readFile: (file) => {
        if (file.path === "Broken.md") throw new Error("read failed");
        return "- [ ] Good task";
      }
    });

    await index.scanFiles([markdownFile({ path: "Broken.md" }), markdownFile({ path: "Good.md" })]);

    expect(index.getTasks().map((task) => task.text)).toEqual(["Good task"]);
    expect(index.getFileState("Broken.md")?.lastError).toContain("read failed");
    expect(index.getStats().failed).toBe(1);
  });
});

function markdownFile(overrides: Partial<IndexableFile> & { mtime?: number; size?: number }): IndexableFile {
  return {
    path: overrides.path ?? "Inbox.md",
    extension: overrides.extension ?? "md",
    stat: {
      ctime: overrides.stat?.ctime ?? 1,
      mtime: overrides.stat?.mtime ?? overrides.mtime ?? 1,
      size: overrides.stat?.size ?? overrides.size ?? 16
    }
  };
}
