import { readFileSync } from "fs";
import * as path from "path";

describe("Apple helper source", () => {
  it("looks up Apple Calendar events by eventIdentifier before falling back to calendarItemIdentifier", () => {
    const source = readFileSync(path.join(__dirname, "..", "apple-helper", "TaskHubAppleHelper.swift"), "utf8");

    expect(source).toContain("store.event(withIdentifier: id) ?? store.calendarItem(withIdentifier: id) as? EKEvent");
  });
});
