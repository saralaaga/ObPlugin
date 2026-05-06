import { MarkdownView, Notice, Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { PLUGIN_DISPLAY_NAME, TASK_HUB_VIEW_TYPE } from "./constants";
import { completeTaskInContent, type CompletionResult } from "./indexing/taskActions";
import { TaskIndex } from "./indexing/taskIndex";
import { DEFAULT_SETTINGS, TaskHubSettingTab } from "./settings";
import type { TaskHubSettings, TaskItem } from "./types";
import { TaskHubView } from "./views/TaskHubView";

export default class TaskHubPlugin extends Plugin {
  settings: TaskHubSettings = DEFAULT_SETTINGS;
  taskIndex: TaskIndex = this.createTaskIndex();

  async onload(): Promise<void> {
    await this.loadSettings();
    this.taskIndex = this.createTaskIndex();

    this.registerView(TASK_HUB_VIEW_TYPE, (leaf: WorkspaceLeaf) => new TaskHubView(leaf, this));
    this.addSettingTab(new TaskHubSettingTab(this.app, this));

    this.addRibbonIcon("list-checks", PLUGIN_DISPLAY_NAME, () => {
      void this.activateView();
    });

    this.addCommand({
      id: "open-task-hub",
      name: "Open Task Hub",
      callback: () => void this.activateView()
    });

    this.addCommand({
      id: "rescan-task-hub",
      name: "Rescan Task Hub",
      callback: () => void this.scanVault()
    });

    this.registerVaultEvents();

    if (this.settings.indexOnStartup) {
      this.app.workspace.onLayoutReady(() => {
        void this.scanVault();
      });
    }
  }

  async onunload(): Promise<void> {
    this.app.workspace.detachLeavesOfType(TASK_HUB_VIEW_TYPE);
  }

  async loadSettings(): Promise<void> {
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...(await this.loadData())
    };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  async scanVault(): Promise<void> {
    await this.taskIndex.scanFiles(this.app.vault.getMarkdownFiles().map((file) => this.toIndexableFile(file)));
    this.refreshOpenViews();
  }

  async completeTask(task: TaskItem): Promise<CompletionResult> {
    const file = this.app.vault.getFileByPath(task.filePath);
    if (!file) {
      const result: CompletionResult = { status: "conflict", message: `File not found: ${task.filePath}` };
      new Notice(result.message);
      return result;
    }

    const completion = {
      result: {
        status: "conflict",
        message: "Task Hub could not update the task."
      } as CompletionResult
    };

    await this.app.vault.process(file, (content) => {
      completion.result = completeTaskInContent(content, task);
      return completion.result.status === "updated" ? completion.result.content : content;
    });

    const completionResult = completion.result;
    if (completionResult.status === "updated") {
      await this.reindexVaultFile(file);
      new Notice("Task completed.");
    } else if (completionResult.status === "already_completed") {
      new Notice("Task is already completed.");
    } else {
      new Notice(completionResult.message);
    }

    this.refreshOpenViews();
    return completionResult;
  }

  async jumpToTask(task: TaskItem): Promise<void> {
    const file = this.app.vault.getFileByPath(task.filePath);
    if (!file) {
      new Notice(`File not found: ${task.filePath}`);
      return;
    }

    const leaf = this.app.workspace.getLeaf(false);
    await leaf.openFile(file, {
      active: true,
      eState: { line: task.line }
    });
    this.app.workspace.revealLeaf(leaf);

    if (leaf.view instanceof MarkdownView) {
      leaf.view.editor.setCursor({ line: task.line, ch: 0 });
      leaf.view.editor.scrollIntoView(
        {
          from: { line: task.line, ch: 0 },
          to: { line: task.line, ch: 0 }
        },
        true
      );
    } else {
      new Notice(`Opened ${task.filePath}; line positioning was not available.`);
    }
  }

  private createTaskIndex(): TaskIndex {
    return new TaskIndex({
      ignoredPaths: this.settings.ignoredPaths,
      readFile: async (file) => {
        const vaultFile = this.app.vault.getFileByPath(file.path);
        if (!vaultFile) throw new Error(`File not found: ${file.path}`);
        return this.app.vault.cachedRead(vaultFile);
      }
    });
  }

  private registerVaultEvents(): void {
    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        if (file instanceof TFile) void this.reindexVaultFile(file);
      })
    );

    this.registerEvent(
      this.app.vault.on("create", (file) => {
        if (file instanceof TFile) void this.reindexVaultFile(file);
      })
    );

    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        this.taskIndex.removeFile(file.path);
        this.refreshOpenViews();
      })
    );

    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        this.taskIndex.removeFile(oldPath);
        if (file instanceof TFile) void this.reindexVaultFile(file);
      })
    );
  }

  private async reindexVaultFile(file: TFile): Promise<void> {
    await this.taskIndex.reindexFile(this.toIndexableFile(file));
    this.refreshOpenViews();
  }

  private toIndexableFile(file: TFile) {
    return {
      path: file.path,
      extension: file.extension,
      stat: {
        ctime: file.stat.ctime,
        mtime: file.stat.mtime,
        size: file.stat.size
      }
    };
  }

  private refreshOpenViews(): void {
    for (const leaf of this.app.workspace.getLeavesOfType(TASK_HUB_VIEW_TYPE)) {
      const view = leaf.view;
      if (view instanceof TaskHubView) {
        void view.onOpen();
      }
    }
  }

  private async activateView(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(TASK_HUB_VIEW_TYPE)[0];
    if (existing) {
      this.app.workspace.revealLeaf(existing);
      return;
    }

    const leaf = this.app.workspace.getRightLeaf(false);
    if (!leaf) return;

    await leaf.setViewState({ type: TASK_HUB_VIEW_TYPE, active: true });
    this.app.workspace.revealLeaf(leaf);
  }
}
