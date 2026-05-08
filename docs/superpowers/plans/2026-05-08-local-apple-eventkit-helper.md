# Local Apple EventKit Helper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用一个随插件发布的 macOS Swift/EventKit helper 替换不稳定的 AppleScript/JXA 本地 Apple 同步路径，让普通用户无需安装 Xcode、Homebrew 或额外 Obsidian 插件即可开启只读 Apple Reminders / Apple Calendar 集成。

**Architecture:** Task Hub 插件继续是 Obsidian TypeScript 插件，Apple 本地数据读取下沉到 `taskhub-apple-helper`。插件通过 `child_process.execFile` 调用 helper 的 JSON CLI 接口，helper 负责 EventKit 授权状态、权限请求、Reminders 读取和 Calendar 读取；插件侧只做后端探测、错误归类、数据映射和设置页展示。

**Tech Stack:** TypeScript, Jest, Obsidian Plugin API, Swift, EventKit, esbuild, Node `child_process.execFile`.

---

## Design Decisions

- 主插件不依赖任何其他 Obsidian 插件。
- 普通用户不需要安装 Xcode；开发者和发布流水线才需要 Swift 编译环境。
- Apple 集成默认关闭，开启后才探测 helper 和请求权限。
- Reminders / Calendar 均保持只读，不创建、不完成、不修改 Apple 系统数据。
- helper 缺失、未授权、权限拒绝、EventKit 失败、JSON 解析失败、超时必须展示不同状态。
- 旧 AppleScript/JXA 路径不再作为正式同步后端；只保留诊断脚本中用于对比的探针。
- 当前仓库存在 `src/localApple.ts` 的临时 AppleScript 改动，实施前必须收口，避免把不稳定路径继续带入正式代码。

## File Structure

- Create: `apple-helper/TaskHubAppleHelper.swift`
  - Swift CLI 入口，解析 `status`、`request-access`、`reminders`、`calendar` 命令。
  - 只输出 JSON 到 stdout，错误输出到 stderr，并使用稳定 exit code。
- Create: `apple-helper/Info.plist`
  - 包含 `NSCalendarsFullAccessUsageDescription`、`NSRemindersFullAccessUsageDescription`，用于 EventKit 权限提示。
- Create: `scripts/build-apple-helper.cjs`
  - 开发/发布时编译 helper；默认编译当前架构，可选 universal。
- Create: `scripts/check-apple-helper.cjs`
  - 验证 helper 是否存在、可执行、能返回 `status` JSON。
- Modify: `package.json`
  - 新增 `build:apple-helper`、`check:apple-helper`、`diagnose:apple` 脚本。
- Modify: `.gitignore`
  - 忽略编译产物 `apple-helper/build/` 和打包 helper 二进制。
- Modify: `src/localApple.ts`
  - 将 AppleScript/JXA 后端替换为 helper backend。
  - 保留纯数据映射函数，新增 helper JSON parsing 和错误分类。
- Modify: `src/localApple.test.ts`
  - 增加 helper 输出、权限状态、缺失 helper、超时和映射测试。
- Modify: `src/types.ts`
  - 扩展本地 Apple 后端状态类型，支持 `missing_helper`、`not_determined`、`denied`、`authorized`、`unavailable`。
- Modify: `src/settings.ts`
  - 设置页展示 helper 状态、授权状态、请求授权按钮和同步按钮。
- Modify: `src/i18n.ts`
  - 同步新增英文/中文文案。
- Modify: `scripts/smoke-plugin-runtime.cjs`
  - mock helper backend，保证打包后的插件 runtime smoke 覆盖 Apple helper 路径。
- Modify: `docs/manual-test-vault.md`
  - 增加 macOS Apple helper 手工测试清单。
- Modify: `README.md`
  - 说明 Apple 集成是 macOS-only、只读、无需 Xcode；开发构建 helper 需要 Swift 工具链。

## Helper CLI Contract

所有命令都只输出一个 JSON 对象。成功时 exit code 为 `0`，失败时 exit code 为非零。

### `status`

Command:

```bash
taskhub-apple-helper status
```

Expected stdout:

```json
{
  "ok": true,
  "platform": "macos",
  "reminders": {
    "authorization": "notDetermined"
  },
  "calendar": {
    "authorization": "notDetermined"
  }
}
```

### `request-access`

Command:

```bash
taskhub-apple-helper request-access --reminders --calendar
```

Expected stdout:

```json
{
  "ok": true,
  "reminders": {
    "authorization": "fullAccess"
  },
  "calendar": {
    "authorization": "fullAccess"
  }
}
```

### `reminders`

Command:

```bash
taskhub-apple-helper reminders
```

Expected stdout:

```json
{
  "ok": true,
  "reminders": [
    {
      "id": "x-apple-reminder://ABC",
      "title": "Buy milk",
      "list": "Personal",
      "completed": false,
      "dueDate": "2026-05-08T09:00:00Z",
      "notes": "Use shared list",
      "priority": 0
    }
  ]
}
```

### `calendar`

Command:

```bash
taskhub-apple-helper calendar --from 2026-05-01T00:00:00Z --to 2026-06-01T00:00:00Z
```

Expected stdout:

```json
{
  "ok": true,
  "events": [
    {
      "id": "ABCDEF",
      "title": "Planning",
      "calendar": "Work",
      "startDate": "2026-05-08T10:00:00Z",
      "endDate": "2026-05-08T10:30:00Z",
      "allDay": false,
      "location": "Office",
      "notes": "Bring agenda",
      "url": null
    }
  ]
}
```

### Error Shape

Expected stdout or stderr JSON:

```json
{
  "ok": false,
  "code": "permission_denied",
  "message": "Calendar access was denied in macOS Privacy & Security settings."
}
```

Allowed `code` values:

```text
missing_helper
not_macos
not_determined
permission_denied
restricted
eventkit_error
invalid_arguments
timeout
invalid_json
unknown_error
```

## Task 1: Stabilize Current Local Apple Baseline

**Files:**
- Modify: `src/localApple.ts`
- Modify: `src/localApple.test.ts`
- Keep: `scripts/diagnose-local-apple.cjs`
- Modify: `package.json`

- [ ] **Step 1: Inspect current uncommitted Apple diff**

Run:

```bash
git status --short --branch
git diff -- src/localApple.ts package.json scripts/diagnose-local-apple.cjs
```

Expected:

```text
M package.json
M src/localApple.ts
?? scripts/diagnose-local-apple.cjs
```

- [ ] **Step 2: Remove temporary AppleScript backend from `src/localApple.ts`**

Replace `readAppleRemindersData()` so it no longer calls `REMINDERS_APPLESCRIPT`:

```ts
export async function readAppleRemindersData(): Promise<TaskItem[]> {
  const output = await runJxa(REMINDERS_SCRIPT);
  const records = parseJsonArray<AppleReminderRecord>(output);
  return records.map((record, index) => reminderToTask(record, index));
}
```

Remove:

```ts
async function runAppleScript(script: string, args: string[] = []): Promise<string> {
  try {
    const result = await execFileAsync("/usr/bin/osascript", ["-e", script, ...args], {
      timeout: OSASCRIPT_TIMEOUT_MS,
      maxBuffer: 1024 * 1024 * 8
    });
    const stdout = typeof result === "string" ? result : result.stdout;
    return stdout.trim();
  } catch (error) {
    throw normalizeAppleScriptError(error);
  }
}
```

Remove:

```ts
function parseReminderRows(output: string): AppleReminderRecord[] {
  if (!output) return [];
  return output
    .split("|||TASKHUB_ROW|||")
    .filter(Boolean)
    .map((row) => {
      const [id, name, list, completed, dueDate, notes] = row.split("|||TASKHUB_FIELD|||");
      return {
        id: id || undefined,
        name: name || undefined,
        list: list || undefined,
        completed: completed === "true",
        dueDate: dueDate || undefined,
        notes: notes || undefined
      };
    });
}
```

Remove the `REMINDERS_APPLESCRIPT` constant from production code.

- [ ] **Step 3: Keep the diagnostic script intentionally**

Keep `scripts/diagnose-local-apple.cjs` because it is useful evidence gathering, but treat its AppleScript probes as diagnostic only. In `package.json`, keep:

```json
"diagnose:apple": "node scripts/diagnose-local-apple.cjs"
```

- [ ] **Step 4: Run baseline tests**

Run:

```bash
npm test
npm run typecheck
```

Expected:

```text
PASS src/localApple.test.ts
```

and TypeScript exits with code `0`.

- [ ] **Step 5: Commit baseline cleanup**

Run:

```bash
git add package.json scripts/diagnose-local-apple.cjs src/localApple.ts src/localApple.test.ts
git commit -m "Prepare local Apple sync for EventKit helper backend"
```

Commit body must use Lore trailers:

```text
AppleScript and JXA remain useful diagnostics, but they are not
reliable enough as the production backend for a published plugin.
This checkpoint keeps the diagnostic script while restoring the
production code to its last tested shape before introducing helper
process support.

Constraint: AppleScript/JXA app lookup and permissions were unstable on the test host
Rejected: Keep the temporary AppleScript reminders backend | it still timed out and lost due dates
Confidence: high
Scope-risk: narrow
Tested: npm test; npm run typecheck
Not-tested: live Obsidian Apple sync
```

## Task 2: Add Swift EventKit Helper Source

**Files:**
- Create: `apple-helper/TaskHubAppleHelper.swift`
- Create: `apple-helper/Info.plist`

- [ ] **Step 1: Create helper source**

Create `apple-helper/TaskHubAppleHelper.swift`:

```swift
import Foundation
import EventKit

struct JsonOutput: Encodable {
    let ok: Bool
    let platform: String?
    let reminders: [ReminderRecord]?
    let events: [CalendarRecord]?
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
    let title: String
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

let encoder = JSONEncoder()
encoder.outputFormatting = [.sortedKeys]
let isoFormatter = ISO8601DateFormatter()
isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

func writeJson(_ value: JsonOutput, exitCode: Int32 = 0) -> Never {
    do {
        let data = try encoder.encode(value)
        FileHandle.standardOutput.write(data)
        FileHandle.standardOutput.write(Data("\n".utf8))
    } catch {
        FileHandle.standardError.write(Data("{\"ok\":false,\"code\":\"unknown_error\",\"message\":\"JSON encoding failed\"}\n".utf8))
    }
    Foundation.exit(exitCode)
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

func requireAccess(_ entityType: EKEntityType) {
    let status = EKEventStore.authorizationStatus(for: entityType)
    let statusText = authString(status)
    if statusText == "fullAccess" || statusText == "authorized" {
        return
    }
    if status == .notDetermined {
        writeJson(JsonOutput(ok: false, platform: nil, reminders: nil, events: nil, remindersStatus: nil, calendarStatus: nil, code: "not_determined", message: "Apple access has not been requested yet."), exitCode: 3)
    }
    if status == .denied {
        writeJson(JsonOutput(ok: false, platform: nil, reminders: nil, events: nil, remindersStatus: nil, calendarStatus: nil, code: "permission_denied", message: "Apple access was denied in macOS Privacy & Security settings."), exitCode: 4)
    }
    if status == .restricted {
        writeJson(JsonOutput(ok: false, platform: nil, reminders: nil, events: nil, remindersStatus: nil, calendarStatus: nil, code: "restricted", message: "Apple access is restricted on this Mac."), exitCode: 5)
    }
    writeJson(JsonOutput(ok: false, platform: nil, reminders: nil, events: nil, remindersStatus: nil, calendarStatus: nil, code: "eventkit_error", message: "Apple access is not available."), exitCode: 6)
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
            if granted {
                return "fullAccess"
            }
            return authString(EKEventStore.authorizationStatus(for: entityType))
        } else {
            return try await withCheckedThrowingContinuation { continuation in
                store.requestAccess(to: entityType) { granted, error in
                    if let error {
                        continuation.resume(throwing: error)
                    } else {
                        continuation.resume(returning: granted ? "authorized" : authString(EKEventStore.authorizationStatus(for: entityType)))
                    }
                }
            }
        }
    } catch {
        return authString(EKEventStore.authorizationStatus(for: entityType))
    }
}

func parseArgument(_ name: String) -> String? {
    let args = CommandLine.arguments
    guard let index = args.firstIndex(of: name), args.indices.contains(index + 1) else {
        return nil
    }
    return args[index + 1]
}

func readReminders(store: EKEventStore) {
    requireAccess(.reminder)
    let calendars = store.calendars(for: .reminder)
    let predicate = store.predicateForReminders(in: calendars)
    let semaphore = DispatchSemaphore(value: 0)
    var output: [ReminderRecord] = []
    var capturedError: Error?

    store.fetchReminders(matching: predicate) { reminders in
        if let reminders {
            output = reminders.map { reminder in
                let due = reminder.dueDateComponents?.date
                return ReminderRecord(
                    id: reminder.calendarItemIdentifier,
                    title: reminder.title ?? "Untitled reminder",
                    list: reminder.calendar.title,
                    completed: reminder.isCompleted,
                    dueDate: due.map { isoFormatter.string(from: $0) },
                    notes: reminder.notes,
                    priority: reminder.priority
                )
            }
        } else {
            capturedError = NSError(domain: "TaskHubAppleHelper", code: 1, userInfo: [NSLocalizedDescriptionKey: "EventKit returned no reminders."])
        }
        semaphore.signal()
    }

    _ = semaphore.wait(timeout: .now() + 30)
    if let capturedError {
        writeJson(JsonOutput(ok: false, platform: nil, reminders: nil, events: nil, remindersStatus: nil, calendarStatus: nil, code: "eventkit_error", message: capturedError.localizedDescription), exitCode: 7)
    }
    writeJson(JsonOutput(ok: true, platform: nil, reminders: output, events: nil, remindersStatus: nil, calendarStatus: nil, code: nil, message: nil))
}

func readCalendar(store: EKEventStore) {
    requireAccess(.event)
    guard
        let fromText = parseArgument("--from"),
        let toText = parseArgument("--to"),
        let from = ISO8601DateFormatter().date(from: fromText),
        let to = ISO8601DateFormatter().date(from: toText)
    else {
        writeJson(JsonOutput(ok: false, platform: nil, reminders: nil, events: nil, remindersStatus: nil, calendarStatus: nil, code: "invalid_arguments", message: "calendar requires --from and --to ISO dates."), exitCode: 2)
    }

    let calendars = store.calendars(for: .event)
    let predicate = store.predicateForEvents(withStart: from, end: to, calendars: calendars)
    let output = store.events(matching: predicate).map { event in
        CalendarRecord(
            id: event.eventIdentifier ?? event.calendarItemIdentifier,
            title: event.title ?? "Untitled event",
            calendar: event.calendar.title,
            startDate: isoFormatter.string(from: event.startDate),
            endDate: event.endDate.map { isoFormatter.string(from: $0) },
            allDay: event.isAllDay,
            location: event.location,
            notes: event.notes,
            url: event.url?.absoluteString
        )
    }
    writeJson(JsonOutput(ok: true, platform: nil, reminders: nil, events: output, remindersStatus: nil, calendarStatus: nil, code: nil, message: nil))
}

@main
struct TaskHubAppleHelper {
    static func main() async {
        #if os(macOS)
        let command = CommandLine.arguments.dropFirst().first ?? "status"
        let store = EKEventStore()

        switch command {
        case "status":
            writeJson(JsonOutput(
                ok: true,
                platform: "macos",
                reminders: nil,
                events: nil,
                remindersStatus: AccessStatus(authorization: authString(EKEventStore.authorizationStatus(for: .reminder))),
                calendarStatus: AccessStatus(authorization: authString(EKEventStore.authorizationStatus(for: .event))),
                code: nil,
                message: nil
            ))
        case "request-access":
            let reminders = CommandLine.arguments.contains("--reminders")
            let calendar = CommandLine.arguments.contains("--calendar")
            let reminderStatus = reminders ? await requestAccess(store: store, entityType: .reminder) : authString(EKEventStore.authorizationStatus(for: .reminder))
            let calendarStatus = calendar ? await requestAccess(store: store, entityType: .event) : authString(EKEventStore.authorizationStatus(for: .event))
            writeJson(JsonOutput(
                ok: true,
                platform: nil,
                reminders: nil,
                events: nil,
                remindersStatus: AccessStatus(authorization: reminderStatus),
                calendarStatus: AccessStatus(authorization: calendarStatus),
                code: nil,
                message: nil
            ))
        case "reminders":
            readReminders(store: store)
        case "calendar":
            readCalendar(store: store)
        default:
            writeJson(JsonOutput(ok: false, platform: nil, reminders: nil, events: nil, remindersStatus: nil, calendarStatus: nil, code: "invalid_arguments", message: "Unknown command: \(command)"), exitCode: 2)
        }
        #else
        writeJson(JsonOutput(ok: false, platform: nil, reminders: nil, events: nil, remindersStatus: nil, calendarStatus: nil, code: "not_macos", message: "Task Hub Apple helper only supports macOS."), exitCode: 2)
        #endif
    }
}
```

- [ ] **Step 2: Create helper Info.plist**

Create `apple-helper/Info.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "https://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleIdentifier</key>
  <string>com.taskhub.applehelper</string>
  <key>CFBundleName</key>
  <string>Task Hub Apple Helper</string>
  <key>CFBundleVersion</key>
  <string>0.1.0</string>
  <key>NSCalendarsFullAccessUsageDescription</key>
  <string>Task Hub reads your local Apple Calendar events so it can show them in your Obsidian task calendar.</string>
  <key>NSRemindersFullAccessUsageDescription</key>
  <string>Task Hub reads your local Apple Reminders so it can show them in your Obsidian task list.</string>
  <key>NSCalendarsUsageDescription</key>
  <string>Task Hub reads your local Apple Calendar events so it can show them in your Obsidian task calendar.</string>
  <key>NSRemindersUsageDescription</key>
  <string>Task Hub reads your local Apple Reminders so it can show them in your Obsidian task list.</string>
</dict>
</plist>
```

- [ ] **Step 3: Compile helper manually once**

Run:

```bash
mkdir -p apple-helper/build
swiftc apple-helper/TaskHubAppleHelper.swift -framework EventKit -Xlinker -sectcreate -Xlinker __TEXT -Xlinker __info_plist -Xlinker apple-helper/Info.plist -o apple-helper/build/taskhub-apple-helper
```

Expected:

```text
apple-helper/build/taskhub-apple-helper
```

- [ ] **Step 4: Verify helper status command**

Run:

```bash
apple-helper/build/taskhub-apple-helper status
```

Expected stdout contains:

```json
"ok":true
```

- [ ] **Step 5: Commit helper source**

Run:

```bash
git add apple-helper/TaskHubAppleHelper.swift apple-helper/Info.plist
git commit -m "Introduce EventKit helper source for local Apple access"
```

Commit body:

```text
The local Apple backend needs a stable EventKit-owned process instead
of relying on application automation. This adds the helper source and
the permission usage strings required for Calendar and Reminders access.

Constraint: End users should not need Xcode or Homebrew to use the released plugin
Rejected: Continue with AppleScript/JXA | app lookup and permission behavior were unstable
Confidence: medium
Scope-risk: moderate
Directive: Keep this helper read-only until write flows have an explicit product design
Tested: swiftc compile; taskhub-apple-helper status
Not-tested: notarized distribution; Obsidian release installation
```

## Task 3: Add Helper Build and Verification Scripts

**Files:**
- Create: `scripts/build-apple-helper.cjs`
- Create: `scripts/check-apple-helper.cjs`
- Modify: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1: Add build script**

Create `scripts/build-apple-helper.cjs`:

```js
const { execFileSync } = require("child_process");
const { mkdirSync, copyFileSync, chmodSync } = require("fs");
const { join } = require("path");

const root = process.cwd();
const outDir = join(root, "apple-helper", "build");
const source = join(root, "apple-helper", "TaskHubAppleHelper.swift");
const plist = join(root, "apple-helper", "Info.plist");
const binary = join(outDir, "taskhub-apple-helper");
const pluginBinary = join(root, "taskhub-apple-helper");

mkdirSync(outDir, { recursive: true });

execFileSync(
  "/usr/bin/swiftc",
  [
    source,
    "-framework",
    "EventKit",
    "-Xlinker",
    "-sectcreate",
    "-Xlinker",
    "__TEXT",
    "-Xlinker",
    "__info_plist",
    "-Xlinker",
    plist,
    "-o",
    binary
  ],
  { stdio: "inherit" }
);

copyFileSync(binary, pluginBinary);
chmodSync(pluginBinary, 0o755);
console.log(`Built ${pluginBinary}`);
```

- [ ] **Step 2: Add check script**

Create `scripts/check-apple-helper.cjs`:

```js
const { execFileSync } = require("child_process");
const { accessSync, constants } = require("fs");
const { join } = require("path");

const helper = join(process.cwd(), "taskhub-apple-helper");

accessSync(helper, constants.X_OK);
const raw = execFileSync(helper, ["status"], { encoding: "utf8", timeout: 8000 });
const parsed = JSON.parse(raw);

if (!parsed.ok || parsed.platform !== "macos") {
  throw new Error(`Unexpected helper status: ${raw}`);
}

console.log(`Apple helper OK: reminders=${parsed.remindersStatus.authorization}, calendar=${parsed.calendarStatus.authorization}`);
```

- [ ] **Step 3: Update `package.json` scripts**

Update scripts:

```json
{
  "build:apple-helper": "node scripts/build-apple-helper.cjs",
  "check:apple-helper": "node scripts/check-apple-helper.cjs",
  "diagnose:apple": "node scripts/diagnose-local-apple.cjs"
}
```

Do not make `npm run build` require Swift yet. Main plugin build should stay usable on non-macOS CI unless release packaging explicitly asks for Apple helper.

- [ ] **Step 4: Update `.gitignore`**

Add:

```gitignore
apple-helper/build/
taskhub-apple-helper
```

- [ ] **Step 5: Verify scripts**

Run:

```bash
npm run build:apple-helper
npm run check:apple-helper
```

Expected:

```text
Built /Users/carlos/Coding/ObPlugin/taskhub-apple-helper
Apple helper OK: reminders=...
```

- [ ] **Step 6: Commit scripts**

Run:

```bash
git add .gitignore package.json scripts/build-apple-helper.cjs scripts/check-apple-helper.cjs
git commit -m "Make the Apple helper build explicit"
```

Commit body:

```text
The helper is a release artifact, not a TypeScript bundle output.
Keeping its build and verification explicit avoids making ordinary
plugin builds depend on Swift while still giving release builds a
repeatable path.

Constraint: npm run build should remain lightweight for plugin-only development
Rejected: Compile Swift helper during every TypeScript build | it would break non-macOS development and slow normal iteration
Confidence: high
Scope-risk: narrow
Tested: npm run build:apple-helper; npm run check:apple-helper
Not-tested: universal binary release build
```

## Task 4: Add Plugin-Side Helper Backend

**Files:**
- Modify: `src/localApple.ts`
- Modify: `src/localApple.test.ts`
- Modify: `src/types.ts`

- [ ] **Step 1: Add helper output types to `src/localApple.ts`**

Add:

```ts
type AppleHelperErrorCode =
  | "missing_helper"
  | "not_macos"
  | "not_determined"
  | "permission_denied"
  | "restricted"
  | "eventkit_error"
  | "invalid_arguments"
  | "timeout"
  | "invalid_json"
  | "unknown_error";

type AppleHelperStatus = {
  ok: boolean;
  platform?: string;
  remindersStatus?: { authorization: string };
  calendarStatus?: { authorization: string };
  code?: AppleHelperErrorCode;
  message?: string;
};

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
```

- [ ] **Step 2: Resolve helper path safely**

Add:

```ts
function getAppleHelperPath(): string {
  const path = require("path") as typeof import("path");
  return path.join(__dirname, "taskhub-apple-helper");
}
```

Use `__dirname` because Obsidian runs bundled `main.js` from the plugin directory, and the helper should sit next to `main.js`.

- [ ] **Step 3: Add `runAppleHelper`**

Add:

```ts
async function runAppleHelper(args: string[]): Promise<string> {
  if (process.platform !== "darwin") {
    throw createLocalAppleError("not_macos", "Local Apple integration only supports macOS.");
  }

  try {
    const result = await execFileAsync(getAppleHelperPath(), args, {
      timeout: OSASCRIPT_TIMEOUT_MS,
      maxBuffer: 1024 * 1024 * 8
    });
    const stdout = typeof result === "string" ? result : result.stdout;
    return stdout.trim();
  } catch (error) {
    throw normalizeAppleHelperError(error);
  }
}
```

- [ ] **Step 4: Parse helper JSON**

Add:

```ts
function parseHelperJson<T extends { ok?: boolean; code?: AppleHelperErrorCode; message?: string }>(output: string): T {
  let parsed: T;
  try {
    parsed = JSON.parse(output) as T;
  } catch (error) {
    throw createLocalAppleError("invalid_json", `Local Apple helper returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (parsed.ok === false) {
    throw createLocalAppleError(parsed.code ?? "unknown_error", parsed.message ?? "Local Apple helper failed.");
  }

  return parsed;
}
```

- [ ] **Step 5: Replace read functions**

Replace:

```ts
export async function readAppleRemindersData(): Promise<TaskItem[]> {
  const output = await runJxa(REMINDERS_SCRIPT);
  const records = parseJsonArray<AppleReminderRecord>(output);
  return records.map((record, index) => reminderToTask(record, index));
}
```

with:

```ts
export async function readAppleRemindersData(): Promise<TaskItem[]> {
  const output = await runAppleHelper(["reminders"]);
  const parsed = parseHelperJson<AppleHelperReminderResponse>(output);
  return (parsed.reminders ?? []).map((record, index) => reminderToTask(record, index));
}
```

Replace calendar reader with:

```ts
export async function readAppleCalendarEventsData(from: Date, to: Date): Promise<CalendarEvent[]> {
  const output = await runAppleHelper(["calendar", "--from", from.toISOString(), "--to", to.toISOString()]);
  const parsed = parseHelperJson<AppleHelperCalendarResponse>(output);
  return (parsed.events ?? []).map((record, index) => calendarRecordToEvent(record, index));
}
```

- [ ] **Step 6: Add explicit status and request access exports**

Add:

```ts
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
```

- [ ] **Step 7: Normalize helper errors**

Add:

```ts
function createLocalAppleError(code: AppleHelperErrorCode, message: string): Error {
  const error = new Error(message) as Error & { code?: AppleHelperErrorCode };
  error.code = code;
  return error;
}

export function normalizeAppleHelperError(error: unknown): Error {
  if (isTimedOutProcessError(error)) {
    return createLocalAppleError("timeout", "Local Apple helper timed out. Try again after granting Calendar and Reminders permissions.");
  }

  const candidate = error as { code?: unknown; message?: unknown; stderr?: unknown };
  if (candidate.code === "ENOENT") {
    return createLocalAppleError("missing_helper", "Task Hub Apple helper is missing. Reinstall the plugin or install a release package that includes the helper.");
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

  const message = error instanceof Error ? error.message : String(error);
  return createLocalAppleError("unknown_error", message || "Local Apple helper failed.");
}
```

- [ ] **Step 8: Add unit tests for helper parsing**

In `src/localApple.test.ts`, add tests for:

```ts
import { calendarRecordToEvent, normalizeAppleHelperError, reminderToTask } from "./localApple";

it("maps missing helper errors to an install hint", () => {
  expect(normalizeAppleHelperError({ code: "ENOENT" }).message).toContain("Apple helper is missing");
});

it("maps helper timeouts to a retry hint", () => {
  expect(normalizeAppleHelperError({ killed: true }).message).toContain("timed out");
});

it("maps helper stderr JSON to a permission hint", () => {
  const error = normalizeAppleHelperError({
    stderr: "{\"ok\":false,\"code\":\"permission_denied\",\"message\":\"Calendar access was denied.\"}"
  }) as Error & { code?: string };
  expect(error.message).toBe("Calendar access was denied.");
  expect(error.code).toBe("permission_denied");
});
```

- [ ] **Step 9: Run tests**

Run:

```bash
npm test -- src/localApple.test.ts
npm run typecheck
```

Expected:

```text
PASS src/localApple.test.ts
```

- [ ] **Step 10: Commit plugin backend**

Run:

```bash
git add src/localApple.ts src/localApple.test.ts src/types.ts
git commit -m "Route local Apple sync through the EventKit helper"
```

Commit body:

```text
The plugin now treats local Apple access as a helper-backed JSON API.
This keeps Obsidian out of AppleScript automation and gives the UI
stable error codes for missing binaries, permissions, EventKit failures,
and timeouts.

Constraint: Obsidian plugin code cannot reliably own Apple EventKit permissions itself
Rejected: Use remindctl as the primary backend | it would require every user to install an external CLI
Confidence: medium
Scope-risk: moderate
Directive: Do not reintroduce AppleScript/JXA as the default backend without reproducing the timeout tests
Tested: npm test -- src/localApple.test.ts; npm run typecheck
Not-tested: live helper invocation inside Obsidian
```

## Task 5: Expose Helper Status and Authorization in Settings

**Files:**
- Modify: `src/types.ts`
- Modify: `src/settings.ts`
- Modify: `src/main.ts`
- Modify: `src/i18n.ts`

- [ ] **Step 1: Extend local Apple status type**

In `src/types.ts`, add:

```ts
export type LocalAppleBackendState =
  | "unknown"
  | "missing_helper"
  | "not_macos"
  | "not_determined"
  | "authorized"
  | "denied"
  | "restricted"
  | "error";
```

Extend `LocalAppleIntegrationSettings` only if a user-facing backend preference is needed later. For this version, do not add a backend dropdown.

- [ ] **Step 2: Add main plugin methods**

In `src/main.ts`, add methods:

```ts
async refreshLocalAppleStatus(): Promise<void> {
  try {
    const status = await getLocalAppleHelperStatus();
    this.localAppleStatus = localAppleStatusFromHelper(status);
  } catch (error) {
    this.localAppleStatus = localAppleStatusFromError(error);
  }
}

async requestLocalApplePermissions(): Promise<void> {
  try {
    await requestLocalAppleAccess({
      reminders: this.settings.localApple.remindersEnabled,
      calendar: this.settings.localApple.calendarEnabled
    });
    await this.refreshLocalAppleStatus();
  } catch (error) {
    this.localAppleStatus = localAppleStatusFromError(error);
  }
}
```

Use existing `localAppleStatus` shape if possible; if the current shape cannot represent helper status cleanly, add small conversion helpers in `src/localApple.ts` rather than expanding UI logic inside `main.ts`.

- [ ] **Step 3: Add i18n keys**

In `src/i18n.ts`, add keys:

```ts
| "localAppleHelperMissing"
| "localAppleHelperMissingDesc"
| "localApplePermissionNotDetermined"
| "localApplePermissionDenied"
| "localApplePermissionRestricted"
| "localAppleRequestAccess"
| "localAppleCheckStatus"
```

English translations:

```ts
localAppleHelperMissing: "Apple helper missing",
localAppleHelperMissingDesc: "Install a Task Hub release that includes taskhub-apple-helper.",
localApplePermissionNotDetermined: "Permission has not been requested.",
localApplePermissionDenied: "Permission denied in macOS Privacy & Security settings.",
localApplePermissionRestricted: "Permission is restricted on this Mac.",
localAppleRequestAccess: "Request access",
localAppleCheckStatus: "Check status",
```

Chinese translations:

```ts
localAppleHelperMissing: "Apple helper 缺失",
localAppleHelperMissingDesc: "请安装包含 taskhub-apple-helper 的 Task Hub 发布包。",
localApplePermissionNotDetermined: "尚未请求权限。",
localApplePermissionDenied: "权限已在 macOS 隐私与安全性设置中被拒绝。",
localApplePermissionRestricted: "这台 Mac 限制了该权限。",
localAppleRequestAccess: "请求权限",
localAppleCheckStatus: "检查状态",
```

- [ ] **Step 4: Update settings UI**

In `src/settings.ts`, add a status row under Local Apple:

```ts
new Setting(containerEl)
  .setName(t("localApple"))
  .setDesc(localAppleStatusSummary(this.plugin.localAppleStatus, t))
  .addButton((button) => {
    button.setButtonText(t("localAppleCheckStatus")).onClick(async () => {
      await this.plugin.refreshLocalAppleStatus();
      this.display();
    });
  })
  .addButton((button) => {
    button.setButtonText(t("localAppleRequestAccess")).onClick(async () => {
      await this.plugin.requestLocalApplePermissions();
      this.display();
    });
  });
```

Button behavior:

- `检查状态` only runs helper `status`.
- `请求权限` only requests enabled integrations.
- If both Reminders and Calendar toggles are off, request button should be disabled or show no-op status.

- [ ] **Step 5: Run UI type verification**

Run:

```bash
npm run typecheck
npm run build
```

Expected: both exit code `0`.

- [ ] **Step 6: Commit settings UX**

Run:

```bash
git add src/types.ts src/settings.ts src/main.ts src/i18n.ts
git commit -m "Show actionable Apple helper permission states"
```

Commit body:

```text
Users need to know whether local Apple sync failed because the helper
is missing, permissions have not been requested, access was denied, or
EventKit failed. The settings page now exposes those states directly
and separates status checks from sync.

Constraint: Apple permissions are host-specific and cannot be inferred from plugin settings
Rejected: Show a generic timeout message | it hides the action the user needs to take
Confidence: medium
Scope-risk: moderate
Tested: npm run typecheck; npm run build
Not-tested: visual check in Obsidian settings pane
```

## Task 6: Update Smoke Test and Test Vault Packaging

**Files:**
- Modify: `scripts/smoke-plugin-runtime.cjs`
- Modify: `docs/manual-test-vault.md`

- [ ] **Step 1: Extend smoke mock**

In `scripts/smoke-plugin-runtime.cjs`, ensure the mocked `child_process.execFile` returns helper JSON for these commands:

```js
if (file.endsWith("taskhub-apple-helper") && args[0] === "status") {
  callback(null, JSON.stringify({
    ok: true,
    platform: "macos",
    remindersStatus: { authorization: "fullAccess" },
    calendarStatus: { authorization: "fullAccess" }
  }), "");
  return;
}

if (file.endsWith("taskhub-apple-helper") && args[0] === "reminders") {
  callback(null, JSON.stringify({
    ok: true,
    reminders: [
      {
        id: "smoke-reminder",
        title: "Smoke reminder",
        list: "Task Hub",
        completed: false,
        dueDate: "2026-05-08T09:00:00.000Z",
        notes: "from smoke",
        priority: 0
      }
    ]
  }), "");
  return;
}

if (file.endsWith("taskhub-apple-helper") && args[0] === "calendar") {
  callback(null, JSON.stringify({
    ok: true,
    events: [
      {
        id: "smoke-event",
        title: "Smoke event",
        calendar: "Task Hub",
        startDate: "2026-05-08T10:00:00.000Z",
        endDate: "2026-05-08T10:30:00.000Z",
        allDay: false,
        location: null,
        notes: "from smoke",
        url: null
      }
    ]
  }), "");
  return;
}
```

- [ ] **Step 2: Add manual test checklist**

Append to `docs/manual-test-vault.md`:

```md
## 本地 Apple Helper 测试

- [ ] 运行 `npm run build:apple-helper`。
- [ ] 运行 `npm run build`。
- [ ] 将 `manifest.json`、`main.js`、`src/styles.css` 和 `taskhub-apple-helper` 同步到测试 vault 插件目录。
- [ ] 在 Obsidian 中打开 Task Hub 设置。
- [ ] 开启 Apple 提醒事项。
- [ ] 点击“检查状态”，确认不再显示 AppleScript/JXA 超时。
- [ ] 点击“请求权限”，在 macOS 权限弹窗中允许提醒事项访问。
- [ ] 点击“同步”，确认 Apple Reminders 只读任务出现在任务列表。
- [ ] 开启 Apple 日历。
- [ ] 点击“请求权限”，允许日历访问。
- [ ] 点击“同步”，确认日历事件出现在日/周/月视图。
- [ ] 在 macOS 系统设置中拒绝权限后再次同步，确认显示“权限已拒绝”而不是“解析错误”或“超时”。
```

- [ ] **Step 3: Run smoke**

Run:

```bash
npm run smoke
```

Expected:

```text
Smoke plugin runtime passed
```

- [ ] **Step 4: Sync to test vault**

Run with escalation if needed:

```bash
mkdir -p /Users/carlos/Coding/testValut/.obsidian/plugins/obsidian-task-hub
cp manifest.json main.js taskhub-apple-helper /Users/carlos/Coding/testValut/.obsidian/plugins/obsidian-task-hub/
cp src/styles.css /Users/carlos/Coding/testValut/.obsidian/plugins/obsidian-task-hub/styles.css
```

Verify:

```bash
cmp -s main.js /Users/carlos/Coding/testValut/.obsidian/plugins/obsidian-task-hub/main.js
cmp -s manifest.json /Users/carlos/Coding/testValut/.obsidian/plugins/obsidian-task-hub/manifest.json
cmp -s src/styles.css /Users/carlos/Coding/testValut/.obsidian/plugins/obsidian-task-hub/styles.css
cmp -s taskhub-apple-helper /Users/carlos/Coding/testValut/.obsidian/plugins/obsidian-task-hub/taskhub-apple-helper
```

- [ ] **Step 5: Commit smoke/manual verification updates**

Run:

```bash
git add scripts/smoke-plugin-runtime.cjs docs/manual-test-vault.md
git commit -m "Cover Apple helper packaging in smoke and manual tests"
```

Commit body:

```text
The helper changes the release shape of the plugin, so smoke and manual
checks need to verify the binary-adjacent runtime path rather than only
the bundled JavaScript.

Constraint: Obsidian loads the plugin from an installed plugin directory, not the source tree
Rejected: Rely on unit tests only | they cannot catch missing release files
Confidence: high
Scope-risk: narrow
Tested: npm run smoke; cmp checks against test vault
Not-tested: macOS permission dialog flow
```

## Task 7: Document Release and User Installation Shape

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: Update README Apple section**

Add:

```md
### 本地 Apple Reminders / Calendar

Task Hub 可以在 macOS 桌面端只读读取本机 Apple Reminders 和 Apple Calendar。

普通用户不需要安装 Xcode、Homebrew 或其他 Obsidian 插件。正式发布包会包含一个小型 `taskhub-apple-helper`，插件通过它调用 Apple EventKit。

开发者如果从源码构建 Apple helper，需要 macOS 和 Swift 工具链：

```bash
npm run build:apple-helper
npm run check:apple-helper
```

Apple 集成默认关闭。第一次开启后，请在设置页点击“请求权限”，并在 macOS 权限弹窗中允许 Task Hub 访问提醒事项或日历。

当前边界：

- 只读读取 Reminders / Calendar。
- 不创建、不修改、不完成 Apple 系统任务或日程。
- 仅支持 Obsidian 桌面端 macOS。
- Windows、Linux、移动端会自动降级为不可用状态。
```

- [ ] **Step 2: Update AGENTS project notes**

In `AGENTS.md`, update Apple notes:

```md
- 本地 Apple Reminders / Apple Calendar 正式同步路径应通过随插件发布的 `taskhub-apple-helper` 调用 EventKit；不要把 AppleScript/JXA 作为默认后端。
- 普通用户不需要 Xcode；开发者构建 helper 时需要 macOS Swift 工具链。
- 发布包除了 `manifest.json`、`main.js`、`styles.css`，还需要包含可执行的 `taskhub-apple-helper`。
```

- [ ] **Step 3: Run docs-adjacent verification**

Run:

```bash
npm run typecheck
npm run build
npm run smoke
```

Expected: all exit code `0`.

- [ ] **Step 4: Commit docs**

Run:

```bash
git add README.md AGENTS.md
git commit -m "Document the EventKit helper release contract"
```

Commit body:

```text
The Apple integration now has a different installation contract from
the plugin-only features. Documenting the helper clarifies that end
users should not install Xcode or external CLIs, while release packages
must include the helper binary.

Constraint: Apple helper support is macOS-only and release-package-dependent
Rejected: Document remindctl as the normal path | it is no longer the intended product shape
Confidence: high
Scope-risk: narrow
Tested: npm run typecheck; npm run build; npm run smoke
Not-tested: user-facing release installation from GitHub assets
```

## Task 8: Final Verification and Review Package

**Files:**
- No new files unless fixes are required.

- [ ] **Step 1: Run full verification**

Run:

```bash
npm test
npm run typecheck
npm run build:apple-helper
npm run check:apple-helper
npm run build
npm run smoke
```

Expected:

```text
PASS
Apple helper OK
Smoke plugin runtime passed
```

- [ ] **Step 2: Run local Apple diagnostic**

Run:

```bash
npm run diagnose:apple
```

Expected:

```json
{
  "generatedAt": "...",
  "platform": "darwin",
  "probes": []
}
```

Review the detailed probe output. If AppleScript/JXA probes fail but EventKit helper status works, that is acceptable and should be recorded as evidence for the helper pivot.

- [ ] **Step 3: Sync final build to test vault**

Run:

```bash
mkdir -p /Users/carlos/Coding/testValut/.obsidian/plugins/obsidian-task-hub
cp manifest.json main.js taskhub-apple-helper /Users/carlos/Coding/testValut/.obsidian/plugins/obsidian-task-hub/
cp src/styles.css /Users/carlos/Coding/testValut/.obsidian/plugins/obsidian-task-hub/styles.css
```

Then:

```bash
cmp -s main.js /Users/carlos/Coding/testValut/.obsidian/plugins/obsidian-task-hub/main.js
cmp -s manifest.json /Users/carlos/Coding/testValut/.obsidian/plugins/obsidian-task-hub/manifest.json
cmp -s src/styles.css /Users/carlos/Coding/testValut/.obsidian/plugins/obsidian-task-hub/styles.css
cmp -s taskhub-apple-helper /Users/carlos/Coding/testValut/.obsidian/plugins/obsidian-task-hub/taskhub-apple-helper
```

- [ ] **Step 4: Prepare review summary**

Collect:

```bash
git status --short --branch
git log --oneline -8
```

Review summary should include:

```md
## Changed Files

- `apple-helper/TaskHubAppleHelper.swift`
- `apple-helper/Info.plist`
- `scripts/build-apple-helper.cjs`
- `scripts/check-apple-helper.cjs`
- `src/localApple.ts`
- `src/settings.ts`
- `src/i18n.ts`
- `src/types.ts`
- `scripts/smoke-plugin-runtime.cjs`
- `docs/manual-test-vault.md`
- `README.md`
- `AGENTS.md`

## Verification

- `npm test`
- `npm run typecheck`
- `npm run build:apple-helper`
- `npm run check:apple-helper`
- `npm run build`
- `npm run smoke`
- test vault `cmp` checks

## Remaining Risks

- 正式发布前还需要决定 helper 二进制是否 Developer ID 签名和 notarize。
- 当前计划先构建当前架构二进制；公开发布建议补 universal binary。
- macOS TCC 权限弹窗必须在真实 Obsidian 安装目录里手工验证。
```

## Release Follow-Up

第一版实现完成后，发布前还需要单独做一个 release packaging 任务：

- 生成 `taskhub-apple-helper` universal binary。
- 决定是否进行 Developer ID 签名和 notarization。
- 确认 GitHub release zip 包含：

```text
manifest.json
main.js
styles.css
taskhub-apple-helper
```

- 在一台干净 macOS 用户环境中验证：

```text
安装插件 -> 开启 Apple 集成 -> 请求权限 -> 同步 Reminders -> 同步 Calendar
```

这个 release 任务不阻塞本计划的代码审核，但阻塞“面向普通用户发布 Apple helper 版本”。

## Self-Review

- Spec coverage: 覆盖了“自研 EventKit helper”、“用户无需安装 Xcode/外部插件”、“设置页可开启并请求权限”、“只读读取 Reminders/Calendar”、“测试 vault 验证”和“发布风险”。
- Placeholder scan: 没有使用 TBD/TODO/实现稍后补 等占位语句；每个任务都有文件、命令和预期结果。
- Type consistency: `AppleReminderRecord`、`AppleCalendarRecord` 沿用现有 `src/localApple.ts` 映射职责；helper 输出字段与映射函数所需字段一致。
