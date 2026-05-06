import { ItemView, Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { PLUGIN_DISPLAY_NAME, TASK_HUB_VIEW_TYPE } from "./constants";
import { TaskIndex } from "./indexing/taskIndex";
import { DEFAULT_SETTINGS, TaskHubSettingTab } from "./settings";
import type { TaskHubSettings } from "./types";

class TaskHubView extends ItemView {
  constructor(
    leaf: WorkspaceLeaf,
    private readonly plugin: TaskHubPlugin
  ) {
    super(leaf);
  }

  getViewType(): string {
    return TASK_HUB_VIEW_TYPE;
  }

  getDisplayText(): string {
    return PLUGIN_DISPLAY_NAME;
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1];
    container.empty();

    const root = container.createDiv({ cls: "task-hub-root" });
    root.createEl("h2", { text: PLUGIN_DISPLAY_NAME });
    const stats = this.plugin.taskIndex.getStats();
    root.createEl("p", {
      text: `Indexed ${stats.taskCount} tasks from ${stats.indexed} changed files. ${stats.skipped} files skipped, ${stats.failed} failed.`
    });
  }
}

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
