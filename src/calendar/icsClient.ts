import type { CalendarEvent, CalendarSource, CalendarSourceStatus } from "../types";

export type IcsResponse = {
  status: number;
  headers: Record<string, string>;
  text: string;
};

export type IcsRequester = (url: string) => IcsResponse | Promise<IcsResponse>;

export type IcsFetchResult = {
  status: Exclude<CalendarSourceStatus, { state: "never" }>;
  events: CalendarEvent[];
};

type CalendarSourceErrorStatus = Extract<CalendarSourceStatus, { state: "error" }>;

export async function fetchIcsSource(source: CalendarSource, requester: IcsRequester): Promise<IcsFetchResult> {
  const attemptedAt = new Date().toISOString();
  let response: IcsResponse;

  try {
    response = await requester(source.url);
  } catch (error) {
    return {
      events: source.cachedEvents ?? [],
      status: errorStatus(
        "network_error",
        error instanceof Error ? error.message : String(error),
        attemptedAt,
        source.status
      )
    };
  }

  if (response.status < 200 || response.status >= 300) {
    return {
      events: source.cachedEvents ?? [],
      status: {
        state: "error",
        errorType: "http_error",
        message: `HTTP ${response.status}`,
        statusCode: response.status,
        lastAttemptAt: attemptedAt,
        lastSuccessfulSyncAt: getLastSuccessfulSyncAt(source.status)
      }
    };
  }

  if (isInvalidContent(response)) {
    return {
      events: source.cachedEvents ?? [],
      status: errorStatus("invalid_content", "Response did not look like an ICS calendar.", attemptedAt, source.status)
    };
  }

  try {
    const events = parseIcsEvents(response.text, source.id);
    return {
      events,
      status: {
        state: "ok",
        lastSyncedAt: attemptedAt,
        eventCount: events.length
      }
    };
  } catch (error) {
    return {
      events: source.cachedEvents ?? [],
      status: errorStatus("parse_error", error instanceof Error ? error.message : String(error), attemptedAt, source.status)
    };
  }
}

export function parseIcsEvents(content: string, sourceId: string): CalendarEvent[] {
  const unfolded = unfoldLines(content);
  if (!unfolded.includes("BEGIN:VCALENDAR")) {
    throw new Error("Missing BEGIN:VCALENDAR");
  }

  const events: CalendarEvent[] = [];
  let current: Record<string, string> | null = null;

  for (const line of unfolded) {
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (current) events.push(toCalendarEvent(current, sourceId));
      current = null;
      continue;
    }
    if (!current) continue;

    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const rawKey = line.slice(0, separator);
    const value = unescapeIcsText(line.slice(separator + 1));
    const key = rawKey.split(";")[0].toUpperCase();
    current[key] = value;
  }

  return events;
}

function toCalendarEvent(fields: Record<string, string>, sourceId: string): CalendarEvent {
  const start = parseIcsDate(fields.DTSTART);
  return {
    id: fields.UID ?? `${sourceId}:${fields.SUMMARY ?? "event"}:${start}`,
    sourceId,
    title: fields.SUMMARY ?? "Untitled event",
    start,
    end: fields.DTEND ? parseIcsDate(fields.DTEND) : undefined,
    allDay: isAllDayDate(fields.DTSTART),
    location: fields.LOCATION,
    description: fields.DESCRIPTION,
    url: fields.URL
  };
}

function parseIcsDate(value: string | undefined): string {
  if (!value) return new Date().toISOString();
  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/);
  if (!match) return value;
  const suffix = value.endsWith("Z") ? "Z" : "";
  return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}${suffix}`;
}

function isAllDayDate(value: string | undefined): boolean {
  return Boolean(value && /^\d{8}$/.test(value));
}

function unfoldLines(content: string): string[] {
  const lines = content.split(/\r?\n/);
  const unfolded: string[] = [];
  for (const line of lines) {
    if (/^[ \t]/.test(line) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] += line.slice(1);
    } else {
      unfolded.push(line.trimEnd());
    }
  }
  return unfolded.filter(Boolean);
}

function unescapeIcsText(value: string): string {
  return value.replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

function isInvalidContent(response: IcsResponse): boolean {
  const contentType = Object.entries(response.headers).find(([key]) => key.toLowerCase() === "content-type")?.[1] ?? "";
  if (contentType.includes("text/html")) return true;
  return /^\s*</.test(response.text);
}

function errorStatus(
  errorType: "network_error" | "invalid_content" | "parse_error",
  message: string,
  lastAttemptAt: string,
  previousStatus: CalendarSourceStatus
): CalendarSourceErrorStatus {
  return {
    state: "error",
    errorType,
    message,
    lastAttemptAt,
    lastSuccessfulSyncAt: getLastSuccessfulSyncAt(previousStatus)
  };
}

function getLastSuccessfulSyncAt(status: CalendarSourceStatus): string | undefined {
  if (status.state === "ok") return status.lastSyncedAt;
  if (status.state === "error") return status.lastSuccessfulSyncAt;
  return undefined;
}
