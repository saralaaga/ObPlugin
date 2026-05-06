import { calendarRecordToEvent, reminderToTask } from "./localApple";

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
});
