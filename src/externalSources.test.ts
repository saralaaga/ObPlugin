import { Platform } from "obsidian";
import { APPLE_REMINDERS_URL, openExternalTaskSource } from "./externalSources";
import type { TaskItem } from "./types";

jest.mock(
  "obsidian",
  () => ({
    Platform: { isMacOS: true }
  }),
  { virtual: true }
);

const appleTask: TaskItem = {
  id: "apple-reminders:1",
  externalId: "reminder-1",
  externalSourceName: "Reminders",
  filePath: "Apple Reminders/Reminders",
  line: 0,
  rawLine: "",
  text: "Buy milk",
  completed: false,
  tags: [],
  source: "apple-reminders"
};

describe("openExternalTaskSource", () => {
  it("opens an external task URL when one is available", () => {
    const openUrl = jest.fn();

    const result = openExternalTaskSource({ ...appleTask, externalUrl: "x-apple-reminderkit://reminder/reminder-1" }, openUrl);

    expect(result).toBe("opened");
    expect(openUrl).toHaveBeenCalledWith("x-apple-reminderkit://reminder/reminder-1");
  });

  it("opens the Apple Reminders app when a reminder has no exact URL", () => {
    const openUrl = jest.fn();

    const result = openExternalTaskSource(appleTask, openUrl);

    expect(result).toBe("opened");
    expect(openUrl).toHaveBeenCalledWith(APPLE_REMINDERS_URL);
  });

  it("does not open Apple Reminders on non-macOS platforms", () => {
    const openUrl = jest.fn();
    (Platform as { isMacOS: boolean }).isMacOS = false;

    const result = openExternalTaskSource(appleTask, openUrl);

    expect(result).toBe("unsupported");
    expect(openUrl).not.toHaveBeenCalled();

    (Platform as { isMacOS: boolean }).isMacOS = true;
  });
});
