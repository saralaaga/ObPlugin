import { App, PluginSettingTab, Setting } from "obsidian";
import { createTranslator, type Translator } from "./i18n";
import type TaskHubPlugin from "./main";
import type { CalendarSource, CalendarSourceStatus, TaskHubSettings } from "./types";

export const DEFAULT_SETTINGS: TaskHubSettings = {
  language: "en",
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
    const t = createTranslator(this.plugin.settings.language);
    containerEl.empty();

    containerEl.createEl("h2", { text: t("settingsTitle") });

    new Setting(containerEl)
      .setName(t("language"))
      .setDesc(t("languageDesc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("en", "English")
          .addOption("zh", "中文")
          .setValue(this.plugin.settings.language)
          .onChange(async (value) => {
            this.plugin.settings.language = value as TaskHubSettings["language"];
            await this.plugin.saveSettings();
            this.display();
          });
      });

    new Setting(containerEl)
      .setName(t("defaultView"))
      .setDesc(t("defaultViewDesc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("tasks", t("tasks"))
          .addOption("calendar", t("calendar"))
          .addOption("tags", t("tags"))
          .setValue(this.plugin.settings.defaultView)
          .onChange(async (value) => {
            this.plugin.settings.defaultView = value as TaskHubSettings["defaultView"];
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(t("weekStartsOn"))
      .setDesc(t("weekStartsOnDesc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("monday", t("monday"))
          .addOption("sunday", t("sunday"))
          .setValue(this.plugin.settings.weekStart)
          .onChange(async (value) => {
            this.plugin.settings.weekStart = value as TaskHubSettings["weekStart"];
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(t("showCompletedByDefault"))
      .setDesc(t("showCompletedByDefaultDesc"))
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.showCompletedByDefault).onChange(async (value) => {
          this.plugin.settings.showCompletedByDefault = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName(t("indexOnStartup"))
      .setDesc(t("indexOnStartupDesc"))
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.indexOnStartup).onChange(async (value) => {
          this.plugin.settings.indexOnStartup = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName(t("ignoredPaths"))
      .setDesc(t("ignoredPathsDesc"))
      .addTextArea((text) => {
        text.setValue(this.plugin.settings.ignoredPaths.join(", ")).onChange(async (value) => {
          this.plugin.settings.ignoredPaths = value
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean);
          await this.plugin.saveSettings();
        });
      });

    containerEl.createEl("h3", { text: t("supportedTaskSyntax") });
    containerEl.createEl("p", {
      text: t("supportedTaskSyntaxDesc")
    });

    this.displayCalendarSources(containerEl);
  }

  private displayCalendarSources(containerEl: HTMLElement): void {
    const t = createTranslator(this.plugin.settings.language);
    containerEl.createEl("h3", { text: t("externalCalendars") });

    for (const source of this.plugin.settings.calendarSources) {
      const statusText =
        source.status.state === "ok"
          ? `${t("synced")}, ${source.status.eventCount} ${t("events")}, ${source.status.lastSyncedAt}`
          : source.status.state === "error"
            ? `${errorTypeLabel(source.status.errorType, t)}: ${source.status.message}`
            : t("neverSynced");

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
        .addText((text) => {
          text.setPlaceholder("60").setValue(String(source.refreshIntervalMinutes)).onChange(async (value) => {
            const minutes = Number.parseInt(value, 10);
            if (Number.isFinite(minutes) && minutes > 0) {
              source.refreshIntervalMinutes = minutes;
              await this.plugin.saveSettings();
            }
          });
        })
        .addButton((button) => {
          button.setButtonText(t("sync")).onClick(async () => {
            await this.plugin.syncCalendarSource(source.id);
            this.display();
          });
        })
        .addButton((button) => {
          button.setButtonText(t("remove")).onClick(async () => {
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
      .setName(t("addIcsSource"))
      .setDesc(t("addIcsSourceDesc"))
      .addText((text) => {
        text.setPlaceholder(t("name")).onChange((value) => {
          name = value.trim();
        });
      })
      .addText((text) => {
        text.setPlaceholder("https://example.com/calendar.ics").onChange((value) => {
          url = value.trim();
        });
      })
      .addButton((button) => {
        button.setButtonText(t("add")).onClick(async () => {
          if (!name || !url) return;
          this.plugin.settings.calendarSources.push(createCalendarSource(name, url));
          await this.plugin.saveSettings();
          this.display();
        });
      });
  }
}

type CalendarErrorType = Extract<CalendarSourceStatus, { state: "error" }>["errorType"];

function errorTypeLabel(errorType: CalendarErrorType, t: Translator): string {
  if (errorType === "network_error") return t("networkError");
  if (errorType === "http_error") return t("httpError");
  if (errorType === "invalid_content") return t("invalidContent");
  return t("parseError");
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
