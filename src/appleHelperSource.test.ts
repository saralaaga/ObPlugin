import { readFileSync } from "fs";
import * as path from "path";

describe("Apple helper source", () => {
  it("looks up Apple Calendar events by eventIdentifier before falling back to calendarItemIdentifier", () => {
    const source = readFileSync(path.join(__dirname, "..", "apple-helper", "TaskHubAppleHelper.swift"), "utf8");

    expect(source).toContain("store.event(withIdentifier: id) ?? store.calendarItem(withIdentifier: id) as? EKEvent");
  });

  it("can create all-day Apple Calendar events from dated tasks", () => {
    const source = readFileSync(path.join(__dirname, "..", "apple-helper", "TaskHubAppleHelper.swift"), "utf8");

    expect(source).toContain("case \"create-calendar-event\"");
    expect(source).toContain("func createCalendarEvent(store: EKEventStore)");
    expect(source).toContain("event.isAllDay = true");
    expect(source).toContain("store.defaultCalendarForNewEvents");
  });

  it("can list Apple calendars with identifiers and colors", () => {
    const source = readFileSync(path.join(__dirname, "..", "apple-helper", "TaskHubAppleHelper.swift"), "utf8");

    expect(source).toContain("case \"calendar-lists\"");
    expect(source).toContain("func readCalendarLists(store: EKEventStore)");
    expect(source).toContain("CalendarListRecord(id: calendar.calendarIdentifier");
    expect(source).toContain("color: hexColor(from: calendar)");
  });
});
