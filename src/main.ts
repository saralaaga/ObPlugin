import { MarkdownView, Notice, Platform, Plugin, requestUrl, TFile, WorkspaceLeaf } from "obsidian";
import { PLUGIN_DISPLAY_NAME, TASK_HUB_VIEW_TYPE } from "./constants";
import { fetchIcsSource } from "./calendar/icsClient";
import { createTranslator } from "./i18n";
import { completeTaskInContent, type CompletionResult } from "./indexing/taskActions";
import { TaskIndex } from "./indexing/taskIndex";
import {
  appleCalendarSource,
  appleRemindersSource,
  configureLocalAppleHelperPath,
  getLocalAppleHelperStatus,
  readAppleCalendarEventsData,
  readAppleRemindersData,
  requestLocalAppleAccess,
  setAppleReminderCompleted,
  type AppleHelperStatus
} from "./localApple";
import { DEFAULT_SETTINGS, TaskHubSettingTab } from "./settings";
import type { CalendarEvent, CalendarSourceStatus, LocalAppleSyncStatus, TaskHubSettings, TaskItem } from "./types";
import { TaskHubView } from "./views/TaskHubView";

export default class TaskHubPlugin extends Plugin {
  settings: TaskHubSettings = DEFAULT_SETTINGS;
  taskIndex: TaskIndex = this.createTaskIndex();
  localAppleTasks: TaskItem[] = [];
  localAppleEvents: CalendarEvent[] = [];
  localAppleStatus: LocalAppleSyncStatus = { state: "never" };

  async onload(): Promise<void> {
    await this.loadSettings();
    this.configureLocalAppleHelper();
    this.taskIndex = this.createTaskIndex();

    this.registerView(TASK_HUB_VIEW_TYPE, (leaf: WorkspaceLeaf) => new TaskHubView(leaf, this));
    this.addSettingTab(new TaskHubSettingTab(this.app, this));

    this.addRibbonIcon("list-checks", PLUGIN_DISPLAY_NAME, () => {
      void this.activateView();
    });

    this.addCommand({
      id: "open-task-hub",
      name: createTranslator(this.settings.language)("openTaskHub"),
      callback: () => void this.activateView()
    });

    this.addCommand({
      id: "rescan-task-hub",
      name: createTranslator(this.settings.language)("rescanTaskHub"),
      callback: () => void this.scanVault()
    });

    this.registerVaultEvents();

    if (this.settings.indexOnStartup) {
      this.app.workspace.onLayoutReady(() => {
        void this.scanVault();
        void this.syncLocalApple();
      });
    } else {
      this.app.workspace.onLayoutReady(() => {
        void this.syncLocalApple();
      });
    }
  }

  async onunload(): Promise<void> {
    this.app.workspace.detachLeavesOfType(TASK_HUB_VIEW_TYPE);
  }

  async loadSettings(): Promise<void> {
    const loaded = (await this.loadData()) as Partial<TaskHubSettings> | null;
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...(loaded ?? {}),
      localApple: {
        ...DEFAULT_SETTINGS.localApple,
        ...(loaded?.localApple ?? {})
      }
    };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    this.refreshOpenViews();
  }

  private configureLocalAppleHelper(): void {
    const adapter = this.app.vault.adapter as typeof this.app.vault.adapter & { getFullPath?: (path: string) => string };
    const pluginDir = this.manifest.dir;
    if (!pluginDir || typeof adapter.getFullPath !== "function") return;
    configureLocalAppleHelperPath(adapter.getFullPath(`${pluginDir}/taskhub-apple-helper`));
  }

  async scanVault(): Promise<void> {
    await this.taskIndex.scanFiles(this.app.vault.getMarkdownFiles().map((file) => this.toIndexableFile(file)));
    await this.syncLocalApple({ silent: true });
    this.refreshOpenViews();
  }

  async completeTask(task: TaskItem): Promise<CompletionResult> {
    const t = createTranslator(this.settings.language);

    if (task.source === "apple-reminders") {
      if (!this.settings.localApple.remindersWritebackEnabled || !task.externalId) {
        const result: CompletionResult = { status: "conflict", message: t("externalTaskReadOnly") };
        new Notice(result.message);
        return result;
      }

      try {
        await setAppleReminderCompleted(task.externalId, !task.completed);
        await this.syncLocalApple({ silent: true });
        new Notice(task.completed ? t("taskReopened") : t("taskCompleted"));
        this.refreshOpenViews();
        return { status: "updated", content: "", line: 0 };
      } catch (error) {
        const result: CompletionResult = {
          status: "conflict",
          message: error instanceof Error ? error.message : String(error)
        };
        new Notice(result.message);
        return result;
      }
    }

    if (task.source !== "vault") {
      const result: CompletionResult = { status: "conflict", message: t("externalTaskReadOnly") };
      new Notice(result.message);
      return result;
    }

    const file = this.app.vault.getFileByPath(task.filePath);
    if (!file) {
      const result: CompletionResult = { status: "conflict", message: `${t("fileNotFound")}: ${task.filePath}` };
      new Notice(result.message);
      return result;
    }

    const completion = {
      result: {
        status: "conflict",
        message: t("taskUpdateFailed")
      } as CompletionResult
    };

    await this.app.vault.process(file, (content) => {
      completion.result = completeTaskInContent(content, task, {
        lineChangedConflict: t("lineChangedConflict"),
        lineMismatchConflict: t("lineMismatchConflict"),
        lineNoLongerOpen: t("lineNoLongerOpen"),
        lineOutsideFile: t("lineOutsideFile")
      });
      return completion.result.status === "updated" ? completion.result.content : content;
    });

    const completionResult = completion.result;
    if (completionResult.status === "updated") {
      await this.reindexVaultFile(file);
      new Notice(t("taskCompleted"));
    } else if (completionResult.status === "already_completed") {
      new Notice(t("taskAlreadyCompleted"));
    } else {
      new Notice(completionResult.message);
    }

    this.refreshOpenViews();
    return completionResult;
  }

  async jumpToTask(task: TaskItem): Promise<void> {
    if (task.source !== "vault") {
      new Notice(`${task.externalSourceName ?? task.filePath}: ${createTranslator(this.settings.language)("externalTaskReadOnly")}`);
      return;
    }

    const file = this.app.vault.getFileByPath(task.filePath);
    const t = createTranslator(this.settings.language);
    if (!file) {
      new Notice(`${t("fileNotFound")}: ${task.filePath}`);
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
      new Notice(`${t("opened")} ${task.filePath}; ${t("linePositionUnavailable")}`);
    }
  }

  getCalendarEvents(): CalendarEvent[] {
    return [
      ...this.settings.calendarSources.flatMap((source) => (source.enabled ? (source.cachedEvents ?? []) : [])),
      ...(this.settings.localApple.calendarEnabled ? this.localAppleEvents : [])
    ];
  }

  getTasks(): TaskItem[] {
    return [...this.taskIndex.getTasks(), ...(this.settings.localApple.remindersEnabled ? this.localAppleTasks : [])];
  }

  getCalendarSources() {
    const appleStatus = this.localAppleSourceStatus();
    const sources = [...this.settings.calendarSources];
    if (this.settings.localApple.calendarEnabled) {
      sources.push(appleCalendarSource("#ef4444", appleStatus.calendar));
    }
    if (this.settings.localApple.remindersEnabled) {
      sources.push(appleRemindersSource("#f59e0b", appleStatus.reminders));
    }
    return sources;
  }

  async syncLocalApple(options: { silent?: boolean } = {}): Promise<void> {
    const enabled = this.settings.localApple.remindersEnabled || this.settings.localApple.calendarEnabled;
    if (!enabled) {
      this.localAppleTasks = [];
      this.localAppleEvents = [];
      this.localAppleStatus = { state: "never" };
      this.refreshOpenViews();
      return;
    }

    const attemptedAt = new Date().toISOString();
    const t = createTranslator(this.settings.language);
    if (!Platform.isDesktopApp || process.platform !== "darwin") {
      const status = localAppleErrorStatus("Local Apple integration is only available in Obsidian desktop on macOS.", attemptedAt);
      this.localAppleTasks = [];
      this.localAppleEvents = [];
      this.localAppleStatus = {
        state: "error",
        lastAttemptAt: attemptedAt,
        message: "Local Apple integration is only available in Obsidian desktop on macOS.",
        reminders: status,
        calendar: status
      };
      if (!options.silent) {
        new Notice(`${t("failedSync")} ${t("localApple")}: ${this.localAppleStatus.message}`);
      }
      this.refreshOpenViews();
      return;
    }

    const [remindersResult, calendarResult] = await Promise.all([
      this.settings.localApple.remindersEnabled
        ? settleLocalAppleSource(() => readAppleRemindersData())
        : Promise.resolve({ ok: true as const, value: [] as TaskItem[] }),
      this.settings.localApple.calendarEnabled
        ? settleLocalAppleSource(() => {
            const now = new Date();
            const from = new Date(now);
            from.setDate(from.getDate() - this.settings.localApple.calendarLookbackDays);
            const to = new Date(now);
            to.setDate(to.getDate() + this.settings.localApple.calendarLookaheadDays);
            return readAppleCalendarEventsData(from, to);
          })
        : Promise.resolve({ ok: true as const, value: [] as CalendarEvent[] })
    ]);

    if (remindersResult.ok) {
      this.localAppleTasks = remindersResult.value;
    } else {
      this.localAppleTasks = [];
    }

    if (calendarResult.ok) {
      this.localAppleEvents = calendarResult.value;
    } else {
      this.localAppleEvents = [];
    }

    const remindersStatus: CalendarSourceStatus = remindersResult.ok
      ? { state: "ok", lastSyncedAt: attemptedAt, eventCount: this.localAppleTasks.length }
      : localAppleErrorStatus(remindersResult.error, attemptedAt);
    const calendarStatus: CalendarSourceStatus = calendarResult.ok
      ? { state: "ok", lastSyncedAt: attemptedAt, eventCount: this.localAppleEvents.length }
      : localAppleErrorStatus(calendarResult.error, attemptedAt);
    const failures = uniqueMessages([remindersResult.ok ? undefined : remindersResult.error, calendarResult.ok ? undefined : calendarResult.error]);

    if (failures.length > 0) {
      this.localAppleStatus = {
        state: "error",
        lastAttemptAt: attemptedAt,
        message: failures.join(" | "),
        reminders: remindersStatus,
        calendar: calendarStatus
      };
      if (!options.silent) {
        new Notice(`${t("failedSync")} ${t("localApple")}: ${this.localAppleStatus.message}`);
      }
    } else {
      this.localAppleStatus = {
        state: "ok",
        lastSyncedAt: attemptedAt,
        itemCount: this.localAppleTasks.length + this.localAppleEvents.length,
        reminders: remindersStatus,
        calendar: calendarStatus
      };
      if (!options.silent) {
        new Notice(`${t("synced")} ${t("localApple")}: ${this.localAppleStatus.itemCount}`);
      }
    }
    this.refreshOpenViews();
  }

  async refreshLocalAppleStatus(): Promise<void> {
    const attemptedAt = new Date().toISOString();
    try {
      this.localAppleStatus = localAppleStatusFromHelper(await getLocalAppleHelperStatus(), attemptedAt);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const status = localAppleErrorStatus(message, attemptedAt);
      this.localAppleStatus = {
        state: "error",
        lastAttemptAt: attemptedAt,
        message,
        reminders: status,
        calendar: status
      };
    }
    this.refreshOpenViews();
  }

  async requestLocalApplePermissions(): Promise<void> {
    const attemptedAt = new Date().toISOString();
    try {
      this.localAppleStatus = localAppleStatusFromHelper(
        await requestLocalAppleAccess({
          reminders: this.settings.localApple.remindersEnabled,
          calendar: this.settings.localApple.calendarEnabled
        }),
        attemptedAt
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const status = localAppleErrorStatus(message, attemptedAt);
      this.localAppleStatus = {
        state: "error",
        lastAttemptAt: attemptedAt,
        message,
        reminders: status,
        calendar: status
      };
    }
    this.refreshOpenViews();
  }

  private localAppleSourceStatus() {
    return {
      calendar: this.localAppleStatus.calendar ?? { state: "never" as const },
      reminders: this.localAppleStatus.reminders ?? { state: "never" as const }
    };
  }

  async syncCalendarSource(sourceId: string): Promise<void> {
    const source = this.settings.calendarSources.find((candidate) => candidate.id === sourceId);
    const t = createTranslator(this.settings.language);
    if (!source) return;

    const result = await fetchIcsSource(source, async (url) => {
      const response = await requestUrl({ url, throw: false });
      return {
        status: response.status,
        headers: response.headers,
        text: response.text
      };
    });

    source.status = result.status;
    if (result.status.state === "ok") {
      source.cachedEvents = result.events;
      new Notice(`${t("synced")} ${source.name}: ${result.events.length} ${t("events")}.`);
    } else {
      new Notice(`${t("failedSync")} ${source.name}: ${result.status.message}`);
    }

    await this.saveSettings();
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

    const leaf = this.app.workspace.getLeaf("tab");

    await leaf.setViewState({ type: TASK_HUB_VIEW_TYPE, active: true });
    this.app.workspace.revealLeaf(leaf);
  }
}

type LocalAppleSettled<T> = { ok: true; value: T } | { ok: false; error: string };

async function settleLocalAppleSource<T>(read: () => Promise<T>): Promise<LocalAppleSettled<T>> {
  try {
    return { ok: true, value: await read() };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function localAppleErrorStatus(message: string, attemptedAt: string): CalendarSourceStatus {
  return {
    state: "error",
    errorType: "local_error",
    message,
    lastAttemptAt: attemptedAt
  };
}

function localAppleStatusFromHelper(status: AppleHelperStatus, attemptedAt: string): LocalAppleSyncStatus {
  const reminders = localAppleAuthorizationStatus(status.remindersStatus?.authorization, attemptedAt);
  const calendar = localAppleAuthorizationStatus(status.calendarStatus?.authorization, attemptedAt);
  const failures = [reminders, calendar]
    .filter((source): source is Extract<CalendarSourceStatus, { state: "error" }> => source.state === "error")
    .map((source) => source.message);

  if (failures.length > 0) {
    return {
      state: "error",
      lastAttemptAt: attemptedAt,
      message: uniqueMessages(failures).join(" | "),
      reminders,
      calendar
    };
  }

  return {
    state: "ok",
    lastSyncedAt: attemptedAt,
    itemCount: 0,
    reminders,
    calendar
  };
}

function localAppleAuthorizationStatus(authorization: string | undefined, attemptedAt: string): CalendarSourceStatus {
  if (authorization === "fullAccess" || authorization === "authorized") {
    return { state: "ok", lastSyncedAt: attemptedAt, eventCount: 0 };
  }
  if (!authorization || authorization === "notDetermined") {
    return localAppleErrorStatus("Permission has not been requested.", attemptedAt);
  }
  if (authorization === "denied") {
    return localAppleErrorStatus("Permission denied in macOS Privacy & Security settings.", attemptedAt);
  }
  if (authorization === "restricted") {
    return localAppleErrorStatus("Permission is restricted on this Mac.", attemptedAt);
  }
  return localAppleErrorStatus(`Apple permission state is ${authorization}.`, attemptedAt);
}

function uniqueMessages(messages: Array<string | undefined>): string[] {
  return Array.from(new Set(messages.filter((message): message is string => Boolean(message))));
}
