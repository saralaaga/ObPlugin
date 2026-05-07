import { execFile } from "child_process";
import { promisify } from "util";
import type { CalendarEvent, CalendarSourceStatus, TaskItem } from "./types";

const execFileAsync = promisify(execFile);
const OSASCRIPT_TIMEOUT_MS = 30000;
const APPLE_CALENDAR_SOURCE_ID = "apple-calendar";
const APPLE_REMINDERS_SOURCE_ID = "apple-reminders";
const APPLE_CALENDAR_SOURCE_NAME = "Apple Calendar";
const APPLE_REMINDERS_SOURCE_NAME = "Apple Reminders";

export type LocalAppleSyncResult = {
  tasks: TaskItem[];
  events: CalendarEvent[];
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
    input.remindersEnabled ? readAppleReminders() : Promise.resolve([]),
    input.calendarEnabled ? readAppleCalendarEvents(from, to) : Promise.resolve([])
  ]);

  return { tasks, events };
}

async function runJxa(script: string, args: string[] = []): Promise<string> {
  try {
    const { stdout } = await execFileAsync("/usr/bin/osascript", ["-l", "JavaScript", "-e", script, ...args], {
      timeout: OSASCRIPT_TIMEOUT_MS,
      maxBuffer: 1024 * 1024 * 8
    });
    return stdout.trim();
  } catch (error) {
    throw normalizeAppleScriptError(error);
  }
}

async function readAppleReminders(): Promise<TaskItem[]> {
  const output = await runJxa(REMINDERS_SCRIPT);
  const records = parseJsonArray<AppleReminderRecord>(output);
  return records.map((record, index) => reminderToTask(record, index));
}

async function readAppleCalendarEvents(from: Date, to: Date): Promise<CalendarEvent[]> {
  const output = await runJxa(CALENDAR_SCRIPT, [from.toISOString(), to.toISOString()]);
  const records = parseJsonArray<AppleCalendarRecord>(output);
  return records.map((record, index) => calendarRecordToEvent(record, index));
}

function parseJsonArray<T>(output: string): T[] {
  if (!output) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(output);
  } catch (error) {
    throw new Error(`Local Apple returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!Array.isArray(parsed)) return [];
  return parsed as T[];
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
    source: APPLE_REMINDERS_SOURCE_ID
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

const REMINDERS_SCRIPT = String.raw`
function run() {
const app = Application("Reminders");
app.includeStandardAdditions = true;
const output = [];
for (const list of app.lists()) {
  const listName = list.name();
  for (const reminder of list.reminders()) {
    const dueDate = reminder.dueDate();
    output.push({
      id: reminder.id(),
      name: reminder.name(),
      list: listName,
      completed: reminder.completed(),
      dueDate: dueDate ? dueDate.toISOString() : null,
      notes: reminder.body()
    });
  }
}
return JSON.stringify(output);
}
`;

const CALENDAR_SCRIPT = String.raw`
function run(argv) {
const app = Application("Calendar");
app.includeStandardAdditions = true;
const from = new Date(argv[0]);
const to = new Date(argv[1]);
const output = [];
for (const calendar of app.calendars()) {
  const calendarName = calendar.name();
  for (const event of calendar.events()) {
    const startDate = event.startDate();
    const endDate = event.endDate();
    if (!startDate || !endDate || startDate >= to || endDate <= from) {
      continue;
    }
    output.push({
      id: event.uid(),
      title: event.summary(),
      calendar: calendarName,
      startDate: startDate ? startDate.toISOString() : null,
      endDate: endDate ? endDate.toISOString() : null,
      allDay: event.alldayEvent(),
      location: event.location(),
      notes: event.description(),
      url: event.url()
    });
  }
}
return JSON.stringify(output);
}
`;
