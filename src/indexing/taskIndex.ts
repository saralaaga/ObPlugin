import { parseTasksFromMarkdown } from "../parsing/taskParser";
import type { IndexedFileState, TaskItem } from "../types";

export type IndexableFile = {
  path: string;
  extension: string;
  stat: {
    ctime: number;
    mtime: number;
    size: number;
  };
};

export type TaskIndexStats = {
  indexed: number;
  skipped: number;
  failed: number;
  taskCount: number;
  lastScanAt?: string;
};

type TaskIndexOptions = {
  ignoredPaths: string[];
  readFile: (file: IndexableFile) => Promise<string>;
  now?: () => Date;
};

export class TaskIndex {
  private readonly tasksById = new Map<string, TaskItem>();
  private readonly taskIdsByPath = new Map<string, string[]>();
  private readonly fileStateByPath = new Map<string, IndexedFileState>();
  private stats: TaskIndexStats = {
    indexed: 0,
    skipped: 0,
    failed: 0,
    taskCount: 0
  };

  constructor(private readonly options: TaskIndexOptions) {}

  async scanFiles(files: IndexableFile[]): Promise<void> {
    this.stats = {
      indexed: 0,
      skipped: 0,
      failed: 0,
      taskCount: this.tasksById.size,
      lastScanAt: this.nowIso()
    };

    for (const file of files) {
      await this.reindexFile(file);
    }

    this.stats.taskCount = this.tasksById.size;
  }

  async reindexFile(file: IndexableFile): Promise<void> {
    if (file.extension !== "md" || this.isIgnored(file.path)) {
      this.stats.skipped += 1;
      return;
    }

    const previousState = this.fileStateByPath.get(file.path);
    if (
      previousState &&
      !previousState.lastError &&
      previousState.mtime === file.stat.mtime &&
      previousState.size === file.stat.size
    ) {
      this.stats.skipped += 1;
      return;
    }

    try {
      const content = await this.options.readFile(file);
      const tasks = parseTasksFromMarkdown({ filePath: file.path, content });
      this.replaceFileTasks(file.path, tasks);
      this.fileStateByPath.set(file.path, {
        path: file.path,
        ctime: file.stat.ctime,
        mtime: file.stat.mtime,
        size: file.stat.size,
        taskIds: tasks.map((task) => task.id),
        lastIndexedAt: this.nowIso()
      });
      this.stats.indexed += 1;
    } catch (error) {
      this.removeFileTasks(file.path);
      this.fileStateByPath.set(file.path, {
        path: file.path,
        ctime: file.stat.ctime,
        mtime: file.stat.mtime,
        size: file.stat.size,
        taskIds: [],
        lastIndexedAt: this.nowIso(),
        lastError: error instanceof Error ? error.message : String(error)
      });
      this.stats.failed += 1;
    } finally {
      this.stats.taskCount = this.tasksById.size;
    }
  }

  removeFile(path: string): void {
    this.removeFileTasks(path);
    this.fileStateByPath.delete(path);
    this.stats.taskCount = this.tasksById.size;
  }

  getTasks(): TaskItem[] {
    return Array.from(this.tasksById.values());
  }

  getFileState(path: string): IndexedFileState | undefined {
    return this.fileStateByPath.get(path);
  }

  getStats(): TaskIndexStats {
    return { ...this.stats, taskCount: this.tasksById.size };
  }

  private replaceFileTasks(path: string, tasks: TaskItem[]): void {
    this.removeFileTasks(path);
    for (const task of tasks) {
      this.tasksById.set(task.id, task);
    }
    this.taskIdsByPath.set(path, tasks.map((task) => task.id));
  }

  private removeFileTasks(path: string): void {
    const previousTaskIds = this.taskIdsByPath.get(path) ?? [];
    for (const taskId of previousTaskIds) {
      this.tasksById.delete(taskId);
    }
    this.taskIdsByPath.delete(path);
  }

  private isIgnored(path: string): boolean {
    return this.options.ignoredPaths.some((ignoredPath) => path.startsWith(ignoredPath));
  }

  private nowIso(): string {
    return (this.options.now?.() ?? new Date()).toISOString();
  }
}
