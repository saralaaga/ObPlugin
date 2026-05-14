import { App, PluginSettingTab, Setting } from "obsidian";
import { createTranslator, type Translator } from "./i18n";
import type TaskHubPlugin from "./main";
import type { CalendarSource, CalendarSourceStatus, LocalAppleSyncStatus, TaskHubSettings } from "./types";

export const DEFAULT_SETTINGS: TaskHubSettings = {
  language: "en",
  defaultView: "tasks",
  weekStart: "monday",
  showCompletedByDefault: false,
  indexOnStartup: true,
  calendarTaskCreationEnabled: true,
  taskCreationFilePath: "Task Hub.md",
  ignoredPaths: ["Templates/", "Archive/"],
  tagViewOrder: [],
  calendarSources: [],
  appleReminderLinks: {},
  localApple: {
    enabled: false,
    remindersEnabled: false,
    remindersColor: "#f59e0b",
    remindersWritebackEnabled: false,
    remindersCreateEnabled: false,
    calendarEnabled: false,
    calendarColor: "#6f94b8",
    calendarLookbackDays: 30,
    calendarLookaheadDays: 90
  }
};

export function normalizeTaskHubSettings(loaded: Partial<TaskHubSettings> | null): TaskHubSettings {
  const loadedLocalApple = loaded?.localApple as Partial<TaskHubSettings["localApple"]> | undefined;
  const localAppleEnabled =
    loadedLocalApple?.enabled ??
    Boolean(loadedLocalApple?.remindersEnabled || loadedLocalApple?.calendarEnabled || DEFAULT_SETTINGS.localApple.enabled);
  return {
    ...DEFAULT_SETTINGS,
    ...(loaded ?? {}),
    calendarTaskCreationEnabled: loaded?.calendarTaskCreationEnabled ?? DEFAULT_SETTINGS.calendarTaskCreationEnabled,
    taskCreationFilePath: loaded?.taskCreationFilePath ?? DEFAULT_SETTINGS.taskCreationFilePath,
    localApple: {
      ...DEFAULT_SETTINGS.localApple,
      ...(loadedLocalApple ?? {}),
      enabled: localAppleEnabled,
      remindersColor: loadedLocalApple?.remindersColor ?? DEFAULT_SETTINGS.localApple.remindersColor,
      calendarColor: loadedLocalApple?.calendarColor ?? DEFAULT_SETTINGS.localApple.calendarColor
    },
    appleReminderLinks: loaded?.appleReminderLinks ?? {}
  };
}

const SOFT_LOCAL_APPLE_COLORS = ["#d97757", "#c7925b", "#9aa66f", "#6f9f8f", "#6f94b8", "#8f83b5"];
type LocalAppleTab = "calendar" | "reminders";

export class TaskHubSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: TaskHubPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    const t = createTranslator(this.plugin.settings.language);
    containerEl.empty();

    new Setting(containerEl).setName(t("settingsTitle")).setHeading();

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
          .addOption("tuesday", t("tuesday"))
          .addOption("wednesday", t("wednesday"))
          .addOption("thursday", t("thursday"))
          .addOption("friday", t("friday"))
          .addOption("saturday", t("saturday"))
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
      .setName(t("calendarTaskCreation"))
      .setDesc(t("calendarTaskCreationDesc"))
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.calendarTaskCreationEnabled).onChange(async (value) => {
          this.plugin.settings.calendarTaskCreationEnabled = value;
          await this.plugin.saveSettings();
          this.display();
        });
      });

    if (this.plugin.settings.calendarTaskCreationEnabled) {
      new Setting(containerEl)
        .setName(t("taskCreationFile"))
        .setDesc(t("taskCreationFileDesc"))
        .addText((text) => {
          text.setPlaceholder(DEFAULT_SETTINGS.taskCreationFilePath).setValue(this.plugin.settings.taskCreationFilePath).onChange(async (value) => {
            this.plugin.settings.taskCreationFilePath = value;
            await this.plugin.saveSettings();
          });
        });
    }

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

    new Setting(containerEl).setName(t("supportedTaskSyntax")).setDesc(t("supportedTaskSyntaxDesc")).setHeading();

    this.displayCalendarSources(containerEl);
    this.displayLocalApple(containerEl);
  }

  private displayLocalApple(containerEl: HTMLElement): void {
    const t = createTranslator(this.plugin.settings.language);
    new Setting(containerEl).setName(t("localApple")).setDesc(t("localAppleDesc")).setHeading();

    new Setting(containerEl)
      .setName(t("localApple"))
      .setDesc(this.plugin.settings.localApple.enabled ? createLocalAppleStatusFragment(undefined, this.plugin.localAppleStatus, t) : t("localAppleDisabledDesc"))
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.localApple.enabled).onChange(async (value) => {
          this.plugin.settings.localApple.enabled = value;
          if (!value) {
            this.plugin.settings.localApple.calendarEnabled = false;
            this.plugin.settings.localApple.remindersEnabled = false;
            this.plugin.settings.localApple.remindersWritebackEnabled = false;
            this.plugin.settings.localApple.remindersCreateEnabled = false;
          }
          await this.plugin.saveSettings();
          await this.plugin.syncLocalApple();
          this.display();
        });
      })
      .addButton((button) => {
        button
          .setButtonText(t("localAppleCheckStatus"))
          .setDisabled(!this.plugin.settings.localApple.enabled)
          .onClick(async () => {
            await this.plugin.refreshLocalAppleStatus();
            this.display();
          });
      })
      .addButton((button) => {
        button
          .setButtonText(t("localAppleRequestAccess"))
          .setDisabled(
            !this.plugin.settings.localApple.enabled ||
              (!this.plugin.settings.localApple.remindersEnabled && !this.plugin.settings.localApple.calendarEnabled)
          )
          .onClick(async () => {
            await this.plugin.requestLocalApplePermissions();
            this.display();
          });
      });

    if (!this.plugin.settings.localApple.enabled) {
      return;
    }

    new Setting(containerEl)
      .setName(t("localAppleCalendar"))
      .setDesc(createLocalAppleStatusFragment(this.plugin.localAppleStatus.calendar, this.plugin.localAppleStatus, t, t("localAppleCalendarDesc")))
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.localApple.calendarEnabled).onChange(async (value) => {
          this.plugin.settings.localApple.calendarEnabled = value;
          await this.plugin.saveSettings();
          await this.plugin.syncLocalApple();
          this.display();
        });
      });

    new Setting(containerEl)
      .setName(t("localAppleReminders"))
      .setDesc(
        this.plugin.settings.localApple.remindersEnabled
          ? createLocalAppleStatusFragment(this.plugin.localAppleStatus.reminders, this.plugin.localAppleStatus, t, t("localAppleRemindersDesc"))
          : t("localAppleRemindersDisabledDesc")
      )
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.localApple.remindersEnabled).onChange(async (value) => {
          this.plugin.settings.localApple.remindersEnabled = value;
          if (!value) {
            this.plugin.settings.localApple.remindersWritebackEnabled = false;
            this.plugin.settings.localApple.remindersCreateEnabled = false;
          }
          await this.plugin.saveSettings();
          await this.plugin.syncLocalApple();
          this.display();
        });
      });

    const tabs = this.enabledLocalAppleTabs();
    if (tabs.length === 0) {
      containerEl.createDiv({ cls: "task-hub-empty", text: t("localAppleNoEnabledTabs") });
      return;
    }

    const activeTab = this.activeLocalAppleTab(tabs);
    const tabList = containerEl.createDiv({ cls: "task-hub-settings-tab-list" });
    for (const tab of tabs) {
      const button = tabList.createEl("button", {
        cls: `task-hub-settings-tab ${tab === activeTab ? "is-active" : ""}`,
        text: tab === "calendar" ? t("localAppleCalendar") : t("localAppleReminders"),
        attr: { type: "button" }
      });
      button.addEventListener("click", () => {
        this.localAppleTab = tab;
        this.display();
      });
    }

    if (activeTab === "calendar") {
      this.displayAppleCalendarTab(containerEl, t);
    } else {
      this.displayAppleRemindersTab(containerEl, t);
    }
  }

  private localAppleTab: LocalAppleTab = "calendar";

  private enabledLocalAppleTabs(): LocalAppleTab[] {
    return [
      this.plugin.settings.localApple.calendarEnabled ? "calendar" : undefined,
      this.plugin.settings.localApple.remindersEnabled ? "reminders" : undefined
    ].filter((tab): tab is LocalAppleTab => Boolean(tab));
  }

  private activeLocalAppleTab(tabs: LocalAppleTab[]): LocalAppleTab {
    if (tabs.includes(this.localAppleTab)) return this.localAppleTab;
    this.localAppleTab = tabs[0];
    return this.localAppleTab;
  }

  private displayAppleCalendarTab(containerEl: HTMLElement, t: Translator): void {
    const panel = containerEl.createDiv({ cls: "task-hub-settings-tab-panel" });

    this.displayLocalAppleColorSetting(
      panel,
      t,
      t("localAppleCalendarColor"),
      t("localAppleCalendarColorDesc"),
      this.plugin.settings.localApple.calendarColor,
      DEFAULT_SETTINGS.localApple.calendarColor,
      (color) => {
        this.plugin.settings.localApple.calendarColor = color;
      }
    );

    new Setting(panel)
      .setName(t("localAppleLookback"))
      .addText((text) => {
        text.setValue(String(this.plugin.settings.localApple.calendarLookbackDays)).onChange(async (value) => {
          const days = Number.parseInt(value, 10);
          if (Number.isFinite(days) && days >= 0) {
            this.plugin.settings.localApple.calendarLookbackDays = days;
            await this.plugin.saveSettings();
          }
        });
      });

    new Setting(panel)
      .setName(t("localAppleLookahead"))
      .addText((text) => {
        text.setValue(String(this.plugin.settings.localApple.calendarLookaheadDays)).onChange(async (value) => {
          const days = Number.parseInt(value, 10);
          if (Number.isFinite(days) && days >= 0) {
            this.plugin.settings.localApple.calendarLookaheadDays = days;
            await this.plugin.saveSettings();
          }
        });
      });
  }

  private displayAppleRemindersTab(containerEl: HTMLElement, t: Translator): void {
    const panel = containerEl.createDiv({ cls: "task-hub-settings-tab-panel" });

    this.displayLocalAppleColorSetting(
      panel,
      t,
      t("localAppleRemindersColor"),
      t("localAppleRemindersColorDesc"),
      this.plugin.settings.localApple.remindersColor,
      DEFAULT_SETTINGS.localApple.remindersColor,
      (color) => {
        this.plugin.settings.localApple.remindersColor = color;
      }
    );

    new Setting(panel)
      .setName(t("localAppleRemindersWriteback"))
      .setDesc(t("localAppleRemindersWritebackDesc"))
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.localApple.remindersWritebackEnabled).onChange(async (value) => {
          this.plugin.settings.localApple.remindersWritebackEnabled = value;
          await this.plugin.saveSettings();
          this.display();
        });
      });

    new Setting(panel)
      .setName(t("localAppleRemindersCreate"))
      .setDesc(t("localAppleRemindersCreateDesc"))
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.localApple.remindersCreateEnabled).onChange(async (value) => {
          this.plugin.settings.localApple.remindersCreateEnabled = value;
          await this.plugin.saveSettings();
          this.display();
        });
      });
  }

  private displayLocalAppleColorSetting(
    containerEl: HTMLElement,
    t: Translator,
    name: string,
    description: string,
    value: string,
    fallback: string,
    setColor: (color: string) => void
  ): void {
    new Setting(containerEl)
      .setName(name)
      .setDesc(description)
      .addExtraButton((button) => {
        const icon = button.extraSettingsEl;
        const setPreview = (color: string) => {
          icon.style.setProperty("--task-hub-color-preview", color);
          icon.setAttribute("aria-label", `${name}: ${color}`);
        };
        button.setIcon("circle").setTooltip(name);
        icon.addClass("task-hub-color-preview");
        setPreview(value);
      })
      .addText((text) => {
        const applyColor = async (nextValue: string) => {
          setColor(normalizeColor(nextValue, fallback));
          await this.plugin.saveSettings();
          this.display();
        };
        text.setPlaceholder(fallback).setValue(value).onChange(applyColor);
      })
      .then((setting) => {
        const palette = setting.controlEl.createDiv({ cls: "task-hub-color-swatches" });
        for (const color of SOFT_LOCAL_APPLE_COLORS) {
          const swatch = palette.createEl("button", {
            cls: `task-hub-color-swatch ${color === value ? "is-selected" : ""}`,
            attr: {
              "aria-label": `${name}: ${color}`,
              type: "button"
            }
          });
          swatch.style.setProperty("--task-hub-swatch-color", color);
          swatch.addEventListener("click", () => {
            setColor(color);
            void this.plugin.saveSettings().then(() => this.display());
          });
        }
      });
  }

  private displayCalendarSources(containerEl: HTMLElement): void {
    const t = createTranslator(this.plugin.settings.language);
    new Setting(containerEl).setName(t("externalCalendars")).setHeading();

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

function createLocalAppleStatusFragment(
  sourceStatus: CalendarSourceStatus | undefined,
  fallback: LocalAppleSyncStatus,
  t: Translator,
  prefix?: string
): DocumentFragment {
  const status = localAppleStatusIndicator(sourceStatus, fallback, t);
  const fragment = document.createDocumentFragment();
  if (prefix) {
    fragment.append(prefix, " | ");
  }
  const indicator = document.createElement("span");
  indicator.className = `task-hub-setting-status ${status.cls}`;
  indicator.textContent = status.icon;
  indicator.setAttribute("aria-label", status.label);
  indicator.setAttribute("title", status.label);
  fragment.append(indicator, " ", status.label);
  return fragment;
}

type LocalAppleStatusIndicator = {
  cls: "is-ok" | "is-error" | "is-never";
  icon: string;
  label: string;
};

function localAppleStatusIndicator(
  sourceStatus: CalendarSourceStatus | undefined,
  fallback: LocalAppleSyncStatus,
  t: Translator
): LocalAppleStatusIndicator {
  if (sourceStatus?.state === "ok") {
    return {
      cls: "is-ok",
      icon: "✓",
      label: `${t("synced")}, ${sourceStatus.eventCount} ${t("events")}, ${sourceStatus.lastSyncedAt}`
    };
  }
  if (sourceStatus?.state === "error") {
    return {
      cls: "is-error",
      icon: "!",
      label: `${t("failedSync")}: ${localAppleMessage(sourceStatus.message, t)}`
    };
  }
  if (fallback.state === "ok") {
    return {
      cls: "is-ok",
      icon: "✓",
      label: `${t("synced")}, ${fallback.itemCount}, ${fallback.lastSyncedAt}`
    };
  }
  if (fallback.state === "error") {
    return {
      cls: "is-error",
      icon: "!",
      label: `${t("failedSync")}: ${localAppleMessage(fallback.message, t)}`
    };
  }
  return {
    cls: "is-never",
    icon: "•",
    label: t("neverSynced")
  };
}

function localAppleMessage(message: string, t: Translator): string {
  if (message.includes("helper is missing")) return `${t("localAppleHelperMissing")}: ${t("localAppleHelperMissingDesc")}`;
  if (message.includes("Permission has not been requested")) return t("localApplePermissionNotDetermined");
  if (message.includes("Permission denied")) return t("localApplePermissionDenied");
  if (message.includes("Permission is restricted")) return t("localApplePermissionRestricted");
  return message;
}

function errorTypeLabel(errorType: CalendarErrorType, t: Translator): string {
  if (errorType === "network_error") return t("networkError");
  if (errorType === "http_error") return t("httpError");
  if (errorType === "invalid_content") return t("invalidContent");
  if (errorType === "local_error") return t("localAppleError");
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

function normalizeColor(value: string, fallback: string): string {
  const trimmed = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : fallback;
}
