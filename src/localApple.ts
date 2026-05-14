import { execFile } from "child_process";
import { createHash } from "crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import * as path from "path";
import { promisify } from "util";
import type { CalendarEvent, CalendarSourceStatus, TaskItem } from "./types";

declare const TASKHUB_APPLE_HELPER_BASE64: string;
declare const TASKHUB_APPLE_HELPER_SHA256: string;

const execFileAsync = promisify(execFile);
const LOCAL_APPLE_TIMEOUT_MS = 30000;
const APPLE_CALENDAR_SOURCE_ID = "apple-calendar";
const APPLE_REMINDERS_SOURCE_ID = "apple-reminders";
const APPLE_CALENDAR_SOURCE_NAME = "Apple Calendar";
const APPLE_REMINDERS_SOURCE_NAME = "Apple Reminders";
let configuredAppleHelperPath: string | undefined;

export type LocalAppleSyncResult = {
  tasks: TaskItem[];
  events: CalendarEvent[];
};

export type AppleHelperErrorCode =
  | "missing_helper"
  | "not_macos"
  | "not_determined"
  | "permission_denied"
  | "restricted"
  | "eventkit_error"
  | "invalid_arguments"
  | "not_found"
  | "timeout"
  | "invalid_json"
  | "unknown_error";

export type AppleHelperStatus = {
  ok: boolean;
  platform?: string;
  remindersStatus?: { authorization: string };
  calendarStatus?: { authorization: string };
  code?: AppleHelperErrorCode;
  message?: string;
};

export function configureLocalAppleHelperPath(helperPath: string): void {
  configuredAppleHelperPath = helperPath;
}

export function installBundledAppleHelper(helperPath: string, platform: NodeJS.Platform = process.platform): boolean {
  const payload = getBundledAppleHelperPayload();
  if (platform !== "darwin" || !payload) {
    return false;
  }

  if (existingAppleHelperMatches(helperPath, payload.sha256)) {
    chmodSync(helperPath, 0o755);
    return true;
  }

  const helperBytes = Buffer.from(payload.base64, "base64");
  const helperHash = createHash("sha256").update(helperBytes).digest("hex");
  if (helperHash !== payload.sha256) {
    return false;
  }

  mkdirSync(path.dirname(helperPath), { recursive: true });
  writeFileSync(helperPath, helperBytes, { mode: 0o755 });
  chmodSync(helperPath, 0o755);
  return true;
}

function getBundledAppleHelperPayload(): { base64: string; sha256: string } | undefined {
  const base64 = typeof TASKHUB_APPLE_HELPER_BASE64 === "string" ? TASKHUB_APPLE_HELPER_BASE64 : "";
  const sha256 = typeof TASKHUB_APPLE_HELPER_SHA256 === "string" ? TASKHUB_APPLE_HELPER_SHA256 : "";
  if (!base64 || !sha256) return undefined;
  return { base64, sha256 };
}

type AppleHelperReminderResponse = {
  ok: boolean;
  reminders?: AppleReminderRecord[];
  code?: AppleHelperErrorCode;
  message?: string;
};

type AppleHelperCalendarResponse = {
  ok: boolean;
  events?: AppleCalendarRecord[];
  code?: AppleHelperErrorCode;
  message?: string;
};

type AppleHelperCreateReminderResponse = {
  ok: boolean;
  reminderId?: string;
  code?: AppleHelperErrorCode;
  message?: string;
};

export async function syncLocalAppleData(input: {
  remindersEnabled: boolean;
  calendarEnabled: boolean;
  calendarLookbackDays: number;
  calendarLookaheadDays: number;
  isDesktopApp?: boolean;
  now?: Date;
}): Promise<LocalAppleSyncResult> {
  if (!input.remindersEnabled && !input.calendarEnabled) {
    return { tasks: [], events: [] };
  }

  if (input.isDesktopApp === false || process.platform !== "darwin") {
    throw new Error("Local Apple integration is only available in Obsidian desktop on macOS.");
  }

  const now = input.now ?? new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - input.calendarLookbackDays);
  const to = new Date(now);
  to.setDate(to.getDate() + input.calendarLookaheadDays);

  const [tasks, events] = await Promise.all([
    input.remindersEnabled ? readAppleRemindersData() : Promise.resolve([]),
    input.calendarEnabled ? readAppleCalendarEventsData(from, to) : Promise.resolve([])
  ]);

  return { tasks, events };
}

function getAppleHelperPath(): string {
  if (configuredAppleHelperPath) return configuredAppleHelperPath;
  return path.join(__dirname, "taskhub-apple-helper");
}

function existingAppleHelperMatches(helperPath: string, expectedSha256: string): boolean {
  if (!existsSync(helperPath)) return false;
  const existing = readFileSync(helperPath);
  return createHash("sha256").update(existing).digest("hex") === expectedSha256;
}

async function runAppleHelper(args: string[]): Promise<string> {
  if (process.platform !== "darwin") {
    throw createLocalAppleError("not_macos", "Local Apple integration only supports macOS.");
  }

  try {
    const result = await execFileAsync(getAppleHelperPath(), args, {
      timeout: LOCAL_APPLE_TIMEOUT_MS,
      maxBuffer: 1024 * 1024 * 8
    });
    const stdout = typeof result === "string" ? result : result.stdout;
    return stdout.trim();
  } catch (error) {
    throw normalizeAppleHelperError(error);
  }
}

export async function readAppleRemindersData(): Promise<TaskItem[]> {
  const output = await runAppleHelper(["reminders"]);
  const parsed = parseHelperJson<AppleHelperReminderResponse>(output);
  return (parsed.reminders ?? []).map((record, index) => reminderToTask(record, index));
}

export async function readAppleCalendarEventsData(from: Date, to: Date): Promise<CalendarEvent[]> {
  const output = await runAppleHelper(["calendar", "--from", from.toISOString(), "--to", to.toISOString()]);
  const parsed = parseHelperJson<AppleHelperCalendarResponse>(output);
  return (parsed.events ?? []).map((record, index) => calendarRecordToEvent(record, index));
}

export async function getLocalAppleHelperStatus(): Promise<AppleHelperStatus> {
  const output = await runAppleHelper(["status"]);
  return parseHelperJson<AppleHelperStatus>(output);
}

export async function requestLocalAppleAccess(input: { reminders: boolean; calendar: boolean }): Promise<AppleHelperStatus> {
  const args = ["request-access"];
  if (input.reminders) args.push("--reminders");
  if (input.calendar) args.push("--calendar");
  const output = await runAppleHelper(args);
  return parseHelperJson<AppleHelperStatus>(output);
}

export async function setAppleReminderCompleted(id: string, completed: boolean): Promise<void> {
  parseHelperJson<{ ok: boolean }>(
    await runAppleHelper(["set-reminder-completed", "--id", id, "--completed", completed ? "true" : "false"])
  );
}

export async function setAppleReminderDueDate(id: string, dueDate: string): Promise<void> {
  parseHelperJson<{ ok: boolean }>(
    await runAppleHelper(["set-reminder-due", "--id", id, "--due", dueDate])
  );
}

export async function setAppleCalendarEventDate(input: {
  id: string;
  targetDate: string;
  start: string;
  end?: string;
  allDay: boolean;
}): Promise<void> {
  const args = [
    "set-calendar-event-date",
    "--id",
    input.id,
    "--date",
    input.targetDate,
    "--start",
    input.start,
    "--all-day",
    input.allDay ? "true" : "false"
  ];
  if (input.end) args.splice(args.length - 2, 0, "--end", input.end);
  parseHelperJson<{ ok: boolean }>(await runAppleHelper(args));
}

export async function createAppleReminder(input: { title: string; notes?: string; dueDate?: string }): Promise<string> {
  const args = ["create-reminder", "--title", input.title];
  if (input.notes) args.push("--notes", input.notes);
  if (input.dueDate) args.push("--due", input.dueDate);
  const parsed = parseHelperJson<AppleHelperCreateReminderResponse>(await runAppleHelper(args));
  if (!parsed.reminderId) {
    throw createLocalAppleError("eventkit_error", "Apple Reminder was created but the helper did not return its identifier.");
  }
  return parsed.reminderId;
}

function parseHelperJson<T extends { ok?: boolean; code?: AppleHelperErrorCode; message?: string }>(output: string): T {
  let parsed: unknown;
  try {
    parsed = JSON.parse(output);
  } catch (error) {
    throw createLocalAppleError(
      "invalid_json",
      `Local Apple helper returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const helperOutput = parsed as T;
  if (helperOutput.ok === false) {
    throw createLocalAppleError(helperOutput.code ?? "unknown_error", helperOutput.message ?? "Local Apple helper failed.");
  }
  return helperOutput;
}

export function normalizeAppleScriptError(error: unknown): Error {
  if (isTimedOutProcessError(error)) {
    return new Error(
      "Local Apple automation timed out. Open Reminders/Calendar once, approve any macOS automation prompts for Obsidian, then sync again."
    );
  }

  const rawMessage = error instanceof Error ? error.message : String(error);
  const message = rawMessage.trim();
  if (message.includes("-1712") || message.toLowerCase().includes("timed out")) {
    return new Error(
      "Local Apple automation timed out. Open Reminders/Calendar once, approve any macOS automation prompts for Obsidian, then sync again."
    );
  }
  if (message.includes("-2700") || message.includes("Application can't be found") || message.includes("Application can’t be found")) {
    return new Error("Local Apple app could not be found by macOS automation. Open Reminders/Calendar once, then sync again.");
  }
  if (message.includes("-1743") || message.toLowerCase().includes("not authorized")) {
    return new Error("Local Apple automation permission was denied. Allow Obsidian automation access in macOS Privacy & Security settings.");
  }
  return new Error(message || "Local Apple automation failed.");
}

function createLocalAppleError(code: AppleHelperErrorCode, message: string): Error {
  const error = new Error(message) as Error & { code?: AppleHelperErrorCode };
  error.code = code;
  return error;
}

export function normalizeAppleHelperError(error: unknown): Error {
  if (isTimedOutProcessError(error)) {
    return createLocalAppleError("timeout", "Local Apple helper timed out. Try again after granting Calendar and Reminders permissions.");
  }

  const candidate = error as { code?: unknown; message?: unknown; stderr?: unknown; stdout?: unknown };
  if (candidate.code === "ENOENT") {
    return createLocalAppleError(
      "missing_helper",
      "Task Hub Apple helper is missing. Reinstall the plugin or install a release package that includes the helper."
    );
  }

  const stderr = typeof candidate.stderr === "string" ? candidate.stderr.trim() : "";
  if (stderr.startsWith("{")) {
    try {
      const parsed = JSON.parse(stderr) as { code?: AppleHelperErrorCode; message?: string };
      return createLocalAppleError(parsed.code ?? "unknown_error", parsed.message ?? "Local Apple helper failed.");
    } catch {
      return createLocalAppleError("unknown_error", stderr);
    }
  }

  const stdout = typeof candidate.stdout === "string" ? candidate.stdout.trim() : "";
  if (stdout.startsWith("{")) {
    try {
      const parsed = JSON.parse(stdout) as { code?: AppleHelperErrorCode; message?: string };
      return createLocalAppleError(parsed.code ?? "unknown_error", parsed.message ?? "Local Apple helper failed.");
    } catch {
      return createLocalAppleError("unknown_error", stdout);
    }
  }

  const message = error instanceof Error ? error.message : String(error);
  return createLocalAppleError("unknown_error", message || "Local Apple helper failed.");
}

function isTimedOutProcessError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { killed?: unknown; signal?: unknown };
  return candidate.killed === true || candidate.signal === "SIGTERM";
}

type AppleReminderRecord = {
  id?: string;
  name?: string;
  list?: string;
  completed?: boolean;
  dueDate?: string;
  notes?: string;
  url?: string;
};

type AppleCalendarRecord = {
  id?: string;
  title?: string;
  calendar?: string;
  startDate?: string;
  endDate?: string;
  allDay?: boolean;
  location?: string;
  notes?: string;
  url?: string;
};

export function reminderToTask(record: AppleReminderRecord, index: number): TaskItem {
  const dueDate = toDateKey(record.dueDate);
  return {
    id: `apple-reminders:${record.id ?? index}`,
    externalId: record.id,
    externalSourceName: record.list ?? APPLE_REMINDERS_SOURCE_NAME,
    filePath: `${APPLE_REMINDERS_SOURCE_NAME}${record.list ? `/${record.list}` : ""}`,
    line: 0,
    rawLine: "",
    text: record.name ?? "Untitled reminder",
    completed: Boolean(record.completed),
    tags: [],
    dueDate,
    contextPreview: record.notes,
    source: APPLE_REMINDERS_SOURCE_ID,
    externalUrl: record.url
  };
}

export function calendarRecordToEvent(record: AppleCalendarRecord, index: number): CalendarEvent {
  return {
    id: record.id ?? String(index),
    sourceId: APPLE_CALENDAR_SOURCE_ID,
    title: record.title ?? "Untitled event",
    start: record.startDate ?? new Date().toISOString(),
    end: record.endDate,
    allDay: Boolean(record.allDay),
    location: record.location,
    description: [record.calendar, record.notes].filter(Boolean).join("\n\n"),
    url: record.url
  };
}

function toDateKey(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
}

export function appleCalendarSource(color = "#ef4444", status: CalendarSourceStatus = { state: "never" }) {
  return {
    id: APPLE_CALENDAR_SOURCE_ID,
    name: APPLE_CALENDAR_SOURCE_NAME,
    type: "apple-calendar" as const,
    url: "local://apple-calendar",
    color,
    enabled: true,
    refreshIntervalMinutes: 0,
    status,
    cachedEvents: []
  };
}

export function appleRemindersSource(color = "#f59e0b", status: CalendarSourceStatus = { state: "never" }) {
  return {
    id: APPLE_REMINDERS_SOURCE_ID,
    name: APPLE_REMINDERS_SOURCE_NAME,
    type: "apple-reminders" as const,
    url: "local://apple-reminders",
    color,
    enabled: true,
    refreshIntervalMinutes: 0,
    status,
    cachedEvents: []
  };
}
