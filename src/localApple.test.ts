import {
  calendarRecordToEvent,
  normalizeAppleHelperError,
  normalizeAppleScriptError,
  reminderToTask,
  setAppleReminderCompleted
} from "./localApple";

jest.mock("child_process", () => ({
  execFile: jest.fn((_file, _args, _options, callback) => callback(null, "{\"ok\":true}", ""))
}));

const { execFile } = jest.requireMock("child_process") as { execFile: jest.Mock };

describe("local Apple mapping", () => {
  it("maps Apple Reminders records to read-only Task Hub tasks", () => {
    expect(
      reminderToTask(
        {
          id: "reminder-1",
          name: "Buy milk",
          list: "Personal",
          completed: false,
          dueDate: "2026-05-06T12:00:00.000Z",
          notes: "Use the shared list"
        },
        0
      )
    ).toMatchObject({
      id: "apple-reminders:reminder-1",
      text: "Buy milk",
      filePath: "Apple Reminders/Personal",
      dueDate: "2026-05-06",
      source: "apple-reminders",
      externalSourceName: "Personal"
    });
  });

  it("maps Apple Calendar records to Task Hub calendar events", () => {
    expect(
      calendarRecordToEvent(
        {
          id: "event-1",
          title: "Planning",
          calendar: "Work",
          startDate: "2026-05-06T09:30:00.000Z",
          endDate: "2026-05-06T10:00:00.000Z",
          allDay: false,
          location: "Office",
          notes: "Bring agenda"
        },
        0
      )
    ).toMatchObject({
      id: "event-1",
      sourceId: "apple-calendar",
      title: "Planning",
      start: "2026-05-06T09:30:00.000Z",
      end: "2026-05-06T10:00:00.000Z",
      allDay: false,
      location: "Office",
      description: "Work\n\nBring agenda"
    });
  });

  it("maps AppleScript application lookup failures to a local Apple action hint", () => {
    expect(normalizeAppleScriptError(new Error("execution error: Error: Application can't be found. (-2700)")).message).toContain(
      "Local Apple app could not be found"
    );
  });

  it("maps AppleScript timeouts to a local Apple automation hint", () => {
    expect(normalizeAppleScriptError(new Error("execution error: AppleEvent timed out. (-1712)")).message).toContain(
      "Local Apple automation timed out"
    );
  });

  it("maps process timeouts to a local Apple automation hint", () => {
    expect(normalizeAppleScriptError({ killed: true }).message).toContain("Local Apple automation timed out");
  });

  it("maps missing helper errors to an install hint", () => {
    const error = normalizeAppleHelperError({ code: "ENOENT" }) as Error & { code?: string };

    expect(error.message).toContain("Apple helper is missing");
    expect(error.code).toBe("missing_helper");
  });

  it("maps helper timeouts to a retry hint", () => {
    const error = normalizeAppleHelperError({ killed: true }) as Error & { code?: string };

    expect(error.message).toContain("Local Apple helper timed out");
    expect(error.code).toBe("timeout");
  });

  it("maps helper stderr JSON to a permission hint", () => {
    const error = normalizeAppleHelperError({
      stderr: "{\"ok\":false,\"code\":\"permission_denied\",\"message\":\"Calendar access was denied.\"}"
    }) as Error & { code?: string };

    expect(error.message).toBe("Calendar access was denied.");
    expect(error.code).toBe("permission_denied");
  });

  it("writes Apple Reminder completion through the helper", async () => {
    await setAppleReminderCompleted("reminder-1", true);

    expect(execFile.mock.calls.at(-1)?.[1]).toEqual(["set-reminder-completed", "--id", "reminder-1", "--completed", "true"]);
  });
});
