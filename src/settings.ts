import { App, PluginSettingTab, Setting } from "obsidian";
import type TaskHubPlugin from "./main";
import type { CalendarSource, TaskHubSettings } from "./types";

export const DEFAULT_SETTINGS: TaskHubSettings = {
  defaultView: "tasks",
  weekStart: "monday",
  showCompletedByDefault: false,
  indexOnStartup: true,
  ignoredPaths: ["Templates/", "Archive/"],
  calendarSources: []
};

export class TaskHubSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: TaskHubPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Task Hub Settings" });

    new Setting(containerEl)
      .setName("Default view")
      .setDesc("View shown when Task Hub opens.")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("tasks", "Tasks")
          .addOption("calendar", "Calendar")
          .addOption("tags", "Tags")
          .setValue(this.plugin.settings.defaultView)
          .onChange(async (value) => {
            this.plugin.settings.defaultView = value as TaskHubSettings["defaultView"];
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Week starts on")
      .setDesc("Controls week grouping and calendar layout.")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("monday", "Monday")
          .addOption("sunday", "Sunday")
          .setValue(this.plugin.settings.weekStart)
          .onChange(async (value) => {
            this.plugin.settings.weekStart = value as TaskHubSettings["weekStart"];
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Show completed tasks by default")
      .setDesc("Completed tasks remain indexed but hidden unless this is enabled.")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.showCompletedByDefault).onChange(async (value) => {
          this.plugin.settings.showCompletedByDefault = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Index on startup")
      .setDesc("Scan changed Markdown files when Obsidian starts.")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.indexOnStartup).onChange(async (value) => {
          this.plugin.settings.indexOnStartup = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Ignored paths")
      .setDesc("Comma-separated folder or file prefixes.")
      .addTextArea((text) => {
        text.setValue(this.plugin.settings.ignoredPaths.join(", ")).onChange(async (value) => {
          this.plugin.settings.ignoredPaths = value
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean);
          await this.plugin.saveSettings();
        });
      });

    containerEl.createEl("h3", { text: "Supported task syntax" });
    containerEl.createEl("p", {
      text: "Version 1 supports - [ ], - [x], Obsidian tags, 📅 YYYY-MM-DD, and due:: YYYY-MM-DD."
    });

    this.displayCalendarSources(containerEl);
  }

  private displayCalendarSources(containerEl: HTMLElement): void {
    containerEl.createEl("h3", { text: "External calendars" });

    for (const source of this.plugin.settings.calendarSources) {
      const statusText =
        source.status.state === "ok"
          ? `OK, ${source.status.eventCount} events, ${source.status.lastSyncedAt}`
          : source.status.state === "error"
            ? `${source.status.errorType}: ${source.status.message}`
            : "Never synced";

      new Setting(containerEl)
        .setName(source.name)
        .setDesc(`${source.url} | ${statusText}`)
        .addToggle((toggle) => {
          toggle.setValue(source.enabled).onChange(async (value) => {
            source.enabled = value;
            await this.plugin.saveSettings();
            this.display();
          });
        })
        .addText((text) => {
          text.setPlaceholder("#3b82f6").setValue(source.color).onChange(async (value) => {
            source.color = value;
            await this.plugin.saveSettings();
          });
        })
        .addButton((button) => {
          button.setButtonText("Sync").onClick(async () => {
            await this.plugin.syncCalendarSource(source.id);
            this.display();
          });
        })
        .addButton((button) => {
          button.setButtonText("Remove").onClick(async () => {
            this.plugin.settings.calendarSources = this.plugin.settings.calendarSources.filter(
              (candidate) => candidate.id !== source.id
            );
            await this.plugin.saveSettings();
            this.display();
          });
        });
    }

    let name = "";
    let url = "";
    new Setting(containerEl)
      .setName("Add ICS source")
      .setDesc("Add a public read-only .ics URL.")
      .addText((text) => {
        text.setPlaceholder("Name").onChange((value) => {
          name = value.trim();
        });
      })
      .addText((text) => {
        text.setPlaceholder("https://example.com/calendar.ics").onChange((value) => {
          url = value.trim();
        });
      })
      .addButton((button) => {
        button.setButtonText("Add").onClick(async () => {
          if (!name || !url) return;
          this.plugin.settings.calendarSources.push(createCalendarSource(name, url));
          await this.plugin.saveSettings();
          this.display();
        });
      });
  }
}

function createCalendarSource(name: string, url: string): CalendarSource {
  return {
    id: `ics-${Date.now().toString(36)}`,
    name,
    type: "ics",
    url,
    color: "#3b82f6",
    enabled: true,
    refreshIntervalMinutes: 60,
    status: { state: "never" },
    cachedEvents: []
  };
}
