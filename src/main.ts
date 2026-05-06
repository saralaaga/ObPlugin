import { ItemView, Plugin, WorkspaceLeaf } from "obsidian";
import { PLUGIN_DISPLAY_NAME, TASK_HUB_VIEW_TYPE } from "./constants";

class TaskHubView extends ItemView {
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
    root.createEl("p", { text: "Task Hub is loading." });
  }
}

export default class TaskHubPlugin extends Plugin {
  async onload(): Promise<void> {
    this.registerView(TASK_HUB_VIEW_TYPE, (leaf: WorkspaceLeaf) => new TaskHubView(leaf));

    this.addRibbonIcon("list-checks", PLUGIN_DISPLAY_NAME, () => {
      void this.activateView();
    });

    this.addCommand({
      id: "open-task-hub",
      name: "Open Task Hub",
      callback: () => void this.activateView()
    });
  }

  async onunload(): Promise<void> {
    this.app.workspace.detachLeavesOfType(TASK_HUB_VIEW_TYPE);
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
