import { fetchIcsSource, parseIcsEvents } from "./icsClient";
import type { CalendarSource } from "../types";

const SOURCE: CalendarSource = {
  id: "calendar-1",
  name: "Calendar",
  type: "ics",
  url: "https://example.com/calendar.ics",
  color: "#3b82f6",
  enabled: true,
  refreshIntervalMinutes: 60,
  status: { state: "never" },
  cachedEvents: []
};

describe("fetchIcsSource", () => {
  it("maps request exceptions to network_error", async () => {
    const result = await fetchIcsSource(SOURCE, async () => {
      throw new Error("timeout");
    });

    expect(result.status).toMatchObject({ state: "error", errorType: "network_error" });
  });

  it("maps non-2xx status to http_error", async () => {
    const result = await fetchIcsSource(SOURCE, async () => ({
      status: 403,
      headers: {},
      text: "Forbidden"
    }));

    expect(result.status).toMatchObject({ state: "error", errorType: "http_error", statusCode: 403 });
  });

  it("maps obvious HTML responses to invalid_content", async () => {
    const result = await fetchIcsSource(SOURCE, async () => ({
      status: 200,
      headers: { "content-type": "text/html" },
      text: "<html>login</html>"
    }));

    expect(result.status).toMatchObject({ state: "error", errorType: "invalid_content" });
  });

  it("maps invalid calendar content to parse_error", async () => {
    const result = await fetchIcsSource(SOURCE, async () => ({
      status: 200,
      headers: { "content-type": "text/calendar" },
      text: "not a calendar"
    }));

    expect(result.status).toMatchObject({ state: "error", errorType: "parse_error" });
  });

  it("treats an empty VCALENDAR as a successful sync", async () => {
    const result = await fetchIcsSource(SOURCE, async () => ({
      status: 200,
      headers: { "content-type": "text/calendar" },
      text: "BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR"
    }));

    expect(result.status).toMatchObject({ state: "ok", eventCount: 0 });
    expect(result.events).toEqual([]);
  });
});

describe("parseIcsEvents", () => {
  it("parses VEVENT fields into CalendarEvent", () => {
    const events = parseIcsEvents(
      [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "UID:abc",
        "SUMMARY:Team sync",
        "DTSTART:20260506T100000Z",
        "DTEND:20260506T110000Z",
        "LOCATION:Zoom",
        "DESCRIPTION:Weekly sync",
        "URL:https://example.com",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\n"),
      "source-1"
    );

    expect(events).toEqual([
      {
        id: "abc",
        sourceId: "source-1",
        title: "Team sync",
        start: "2026-05-06T10:00:00Z",
        end: "2026-05-06T11:00:00Z",
        allDay: false,
        location: "Zoom",
        description: "Weekly sync",
        url: "https://example.com"
      }
    ]);
  });
});
