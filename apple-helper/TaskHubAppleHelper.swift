import EventKit
import Foundation

struct HelperOutput: Encodable {
    let ok: Bool
    let platform: String?
    let reminders: [ReminderRecord]?
    let events: [CalendarRecord]?
    let reminderId: String?
    let remindersStatus: AccessStatus?
    let calendarStatus: AccessStatus?
    let code: String?
    let message: String?
}

struct AccessStatus: Encodable {
    let authorization: String
}

struct ReminderRecord: Encodable {
    let id: String
    let name: String
    let list: String
    let completed: Bool
    let dueDate: String?
    let notes: String?
    let priority: Int
}

struct CalendarRecord: Encodable {
    let id: String
    let title: String
    let calendar: String
    let startDate: String
    let endDate: String?
    let allDay: Bool
    let location: String?
    let notes: String?
    let url: String?
}

func jsonEncoder() -> JSONEncoder {
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.sortedKeys]
    return encoder
}

func isoString(from date: Date) -> String {
    let isoFormatter = ISO8601DateFormatter()
    isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return isoFormatter.string(from: date)
}

func writeJson(_ output: HelperOutput, exitCode: Int32 = 0) -> Never {
    do {
        let data = try jsonEncoder().encode(output)
        FileHandle.standardOutput.write(data)
        FileHandle.standardOutput.write(Data("\n".utf8))
    } catch {
        FileHandle.standardError.write(Data("{\"ok\":false,\"code\":\"unknown_error\",\"message\":\"JSON encoding failed\"}\n".utf8))
    }
    Foundation.exit(exitCode)
}

func fail(_ code: String, _ message: String, exitCode: Int32) -> Never {
    writeJson(
        HelperOutput(
            ok: false,
            platform: nil,
            reminders: nil,
            events: nil,
            reminderId: nil,
            remindersStatus: nil,
            calendarStatus: nil,
            code: code,
            message: message
        ),
        exitCode: exitCode
    )
}

func authString(_ status: EKAuthorizationStatus) -> String {
    switch status {
    case .notDetermined:
        return "notDetermined"
    case .restricted:
        return "restricted"
    case .denied:
        return "denied"
    case .authorized:
        return "authorized"
    case .fullAccess:
        return "fullAccess"
    case .writeOnly:
        return "writeOnly"
    @unknown default:
        return "unknown"
    }
}

func hasReadAccess(_ status: EKAuthorizationStatus) -> Bool {
    let statusText = authString(status)
    return statusText == "fullAccess" || statusText == "authorized"
}

func requireAccess(_ entityType: EKEntityType) {
    let status = EKEventStore.authorizationStatus(for: entityType)
    if hasReadAccess(status) {
        return
    }

    switch status {
    case .notDetermined:
        fail("not_determined", "Apple access has not been requested yet.", exitCode: 3)
    case .denied:
        fail("permission_denied", "Apple access was denied in macOS Privacy & Security settings.", exitCode: 4)
    case .restricted:
        fail("restricted", "Apple access is restricted on this Mac.", exitCode: 5)
    default:
        fail("eventkit_error", "Apple access is not available.", exitCode: 6)
    }
}

func requestAccess(store: EKEventStore, entityType: EKEntityType) async -> String {
    do {
        if #available(macOS 14.0, *) {
            let granted: Bool
            if entityType == .event {
                granted = try await store.requestFullAccessToEvents()
            } else {
                granted = try await store.requestFullAccessToReminders()
            }
            return granted ? "fullAccess" : authString(EKEventStore.authorizationStatus(for: entityType))
        }

        return try await withCheckedThrowingContinuation { continuation in
            store.requestAccess(to: entityType) { granted, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                continuation.resume(returning: granted ? "authorized" : authString(EKEventStore.authorizationStatus(for: entityType)))
            }
        }
    } catch {
        return authString(EKEventStore.authorizationStatus(for: entityType))
    }
}

func argumentValue(_ name: String) -> String? {
    let args = CommandLine.arguments
    guard let index = args.firstIndex(of: name), args.indices.contains(index + 1) else {
        return nil
    }
    return args[index + 1]
}

func parseIsoDate(_ text: String?) -> Date? {
    guard let text else {
        return nil
    }

    if let date = ISO8601DateFormatter().date(from: text) {
        return date
    }

    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter.date(from: text)
}

func readReminders(store: EKEventStore) {
    requireAccess(.reminder)

    let calendars = store.calendars(for: .reminder)
    let predicate = store.predicateForReminders(in: calendars)
    let semaphore = DispatchSemaphore(value: 0)
    var output: [ReminderRecord] = []
    var didComplete = false

    store.fetchReminders(matching: predicate) { reminders in
        output = (reminders ?? []).map { reminder in
            let due = reminder.dueDateComponents?.date
            return ReminderRecord(
                id: reminder.calendarItemIdentifier,
                name: reminder.title ?? "Untitled reminder",
                list: reminder.calendar.title,
                completed: reminder.isCompleted,
                dueDate: due.map { isoString(from: $0) },
                notes: reminder.notes,
                priority: reminder.priority
            )
        }
        didComplete = true
        semaphore.signal()
    }

    _ = semaphore.wait(timeout: .now() + 30)
    if !didComplete {
        fail("timeout", "EventKit reminder fetch timed out.", exitCode: 8)
    }

    writeJson(
        HelperOutput(
            ok: true,
            platform: nil,
            reminders: output,
            events: nil,
            reminderId: nil,
            remindersStatus: nil,
            calendarStatus: nil,
            code: nil,
            message: nil
        )
    )
}

func readCalendar(store: EKEventStore) {
    requireAccess(.event)

    guard let from = parseIsoDate(argumentValue("--from")), let to = parseIsoDate(argumentValue("--to")) else {
        fail("invalid_arguments", "calendar requires --from and --to ISO dates.", exitCode: 2)
    }

    let calendars = store.calendars(for: .event)
    let predicate = store.predicateForEvents(withStart: from, end: to, calendars: calendars)
    let output = store.events(matching: predicate).map { event in
        CalendarRecord(
            id: event.eventIdentifier ?? event.calendarItemIdentifier,
            title: event.title ?? "Untitled event",
            calendar: event.calendar.title,
            startDate: isoString(from: event.startDate),
            endDate: event.endDate.map { isoString(from: $0) },
            allDay: event.isAllDay,
            location: event.location,
            notes: event.notes,
            url: event.url?.absoluteString
        )
    }

    writeJson(
        HelperOutput(
            ok: true,
            platform: nil,
            reminders: nil,
            events: output,
            reminderId: nil,
            remindersStatus: nil,
            calendarStatus: nil,
            code: nil,
            message: nil
        )
    )
}

func setReminderCompleted(store: EKEventStore) {
    requireAccess(.reminder)

    guard let id = argumentValue("--id"), !id.isEmpty else {
        fail("invalid_arguments", "set-reminder-completed requires --id.", exitCode: 2)
    }

    guard let completedText = argumentValue("--completed"), completedText == "true" || completedText == "false" else {
        fail("invalid_arguments", "set-reminder-completed requires --completed true or false.", exitCode: 2)
    }

    guard let reminder = store.calendarItem(withIdentifier: id) as? EKReminder else {
        fail("not_found", "Apple Reminder no longer exists. Sync Task Hub and try again.", exitCode: 9)
    }

    reminder.completionDate = completedText == "true" ? Date() : nil

    do {
        try store.save(reminder, commit: true)
    } catch {
        fail("eventkit_error", error.localizedDescription, exitCode: 7)
    }

    writeJson(
        HelperOutput(
            ok: true,
            platform: nil,
            reminders: nil,
            events: nil,
            reminderId: nil,
            remindersStatus: nil,
            calendarStatus: nil,
            code: nil,
            message: nil
        )
    )
}

func dueDateComponents(from text: String?) -> DateComponents? {
    guard let text, !text.isEmpty else {
        return nil
    }

    let parts = text.split(separator: "-").compactMap { Int($0) }
    guard parts.count == 3 else {
        fail("invalid_arguments", "create-reminder --due must use YYYY-MM-DD.", exitCode: 2)
    }

    var components = DateComponents()
    components.calendar = Calendar(identifier: .gregorian)
    components.year = parts[0]
    components.month = parts[1]
    components.day = parts[2]
    guard components.calendar?.date(from: components) != nil else {
        fail("invalid_arguments", "create-reminder --due must be a real calendar date.", exitCode: 2)
    }
    return components
}

func createReminder(store: EKEventStore) {
    requireAccess(.reminder)

    guard let title = argumentValue("--title"), !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
        fail("invalid_arguments", "create-reminder requires --title.", exitCode: 2)
    }

    let reminder = EKReminder(eventStore: store)
    reminder.title = title
    reminder.calendar = store.defaultCalendarForNewReminders() ?? store.calendars(for: .reminder).first
    reminder.notes = argumentValue("--notes")
    reminder.dueDateComponents = dueDateComponents(from: argumentValue("--due"))

    guard reminder.calendar != nil else {
        fail("eventkit_error", "No writable Apple Reminders list is available.", exitCode: 7)
    }

    do {
        try store.save(reminder, commit: true)
    } catch {
        fail("eventkit_error", error.localizedDescription, exitCode: 7)
    }

    writeJson(
        HelperOutput(
            ok: true,
            platform: nil,
            reminders: nil,
            events: nil,
            reminderId: reminder.calendarItemIdentifier,
            remindersStatus: nil,
            calendarStatus: nil,
            code: nil,
            message: nil
        )
    )
}

@main
struct TaskHubAppleHelper {
    static func main() async {
        #if os(macOS)
        let command = CommandLine.arguments.dropFirst().first ?? "status"
        let store = EKEventStore()

        switch command {
        case "status":
            writeJson(
                HelperOutput(
                    ok: true,
                    platform: "macos",
                    reminders: nil,
                    events: nil,
                    reminderId: nil,
                    remindersStatus: AccessStatus(authorization: authString(EKEventStore.authorizationStatus(for: .reminder))),
                    calendarStatus: AccessStatus(authorization: authString(EKEventStore.authorizationStatus(for: .event))),
                    code: nil,
                    message: nil
                )
            )
        case "request-access":
            let remindersEnabled = CommandLine.arguments.contains("--reminders")
            let calendarEnabled = CommandLine.arguments.contains("--calendar")
            let remindersStatus = remindersEnabled
                ? await requestAccess(store: store, entityType: .reminder)
                : authString(EKEventStore.authorizationStatus(for: .reminder))
            let calendarStatus = calendarEnabled
                ? await requestAccess(store: store, entityType: .event)
                : authString(EKEventStore.authorizationStatus(for: .event))

            writeJson(
                HelperOutput(
                    ok: true,
                    platform: nil,
                    reminders: nil,
                    events: nil,
                    reminderId: nil,
                    remindersStatus: AccessStatus(authorization: remindersStatus),
                    calendarStatus: AccessStatus(authorization: calendarStatus),
                    code: nil,
                    message: nil
                )
            )
        case "reminders":
            readReminders(store: store)
        case "calendar":
            readCalendar(store: store)
        case "set-reminder-completed":
            setReminderCompleted(store: store)
        case "create-reminder":
            createReminder(store: store)
        default:
            fail("invalid_arguments", "Unknown command: \(command)", exitCode: 2)
        }
        #else
        fail("not_macos", "Task Hub Apple helper only supports macOS.", exitCode: 2)
        #endif
    }
}
