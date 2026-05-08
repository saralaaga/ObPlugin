const { execFile } = require("child_process");

const SHORT_TIMEOUT_MS = 8000;
const LONG_TIMEOUT_MS = 35000;
const REMINDERS_ROWS_APPLESCRIPT = String.raw`
set fieldSep to "|||TASKHUB_FIELD|||"
set rowSep to "|||TASKHUB_ROW|||"
set rows to {}
tell application "/System/Applications/Reminders.app"
  repeat with reminderList in lists
    set listName to name of reminderList
    repeat with reminderItem in reminders of reminderList
      try
        tell reminderItem
          set reminderId to id as text
          set reminderName to name as text
          set reminderCompleted to completed
          try
            set reminderBody to body as text
          on error
            set reminderBody to ""
          end try
        end tell
        set rowText to reminderId & fieldSep & reminderName & fieldSep & (listName as text) & fieldSep & (reminderCompleted as text) & fieldSep & "" & fieldSep & reminderBody
        set end of rows to rowText
      end try
    end repeat
  end repeat
end tell
set previousDelimiters to AppleScript's text item delimiters
set AppleScript's text item delimiters to rowSep
set output to rows as text
set AppleScript's text item delimiters to previousDelimiters
return output
`;

function runExecFile(file, args, timeout = SHORT_TIMEOUT_MS, env = process.env) {
  const startedAt = Date.now();
  return new Promise((resolve) => {
    execFile(file, args, { timeout, maxBuffer: 1024 * 1024 * 8, env }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        durationMs: Date.now() - startedAt,
        code: error && "code" in error ? error.code : undefined,
        signal: error && "signal" in error ? error.signal : undefined,
        killed: error && "killed" in error ? error.killed : undefined,
        message: error ? error.message : undefined,
        stdout: String(stdout ?? "").trim().slice(0, 2000),
        stderr: String(stderr ?? "").trim().slice(0, 2000)
      });
    });
  });
}

async function runProbe(name, file, args, timeout, env) {
  return {
    name,
    file,
    args,
    timeout,
    result: await runExecFile(file, args, timeout, env)
  };
}

function swiftEnv() {
  return {
    ...process.env,
    CLANG_MODULE_CACHE_PATH: "/private/tmp/obplugin-swift-module-cache"
  };
}

async function main() {
  const probes = [];

  probes.push(await runProbe("macos-version", "/usr/bin/sw_vers", [], SHORT_TIMEOUT_MS));
  probes.push(await runProbe("reminders-bundle-id", "/usr/bin/osascript", ["-e", 'id of app "Reminders"'], SHORT_TIMEOUT_MS));
  probes.push(await runProbe("calendar-bundle-id", "/usr/bin/osascript", ["-e", 'id of app "Calendar"'], SHORT_TIMEOUT_MS));
  probes.push(
    await runProbe(
      "jxa-reminders-application-object",
      "/usr/bin/osascript",
      ["-l", "JavaScript", "-e", 'function run(){ const app = Application("Reminders"); return app.name(); }'],
      SHORT_TIMEOUT_MS
    )
  );
  probes.push(
    await runProbe(
      "jxa-calendar-application-object",
      "/usr/bin/osascript",
      ["-l", "JavaScript", "-e", 'function run(){ const app = Application("Calendar"); return app.name(); }'],
      SHORT_TIMEOUT_MS
    )
  );
  probes.push(
    await runProbe(
      "jxa-reminders-count-lists",
      "/usr/bin/osascript",
      ["-l", "JavaScript", "-e", 'function run(){ const app = Application("Reminders"); return JSON.stringify({lists: app.lists().length}); }'],
      LONG_TIMEOUT_MS
    )
  );
  probes.push(
    await runProbe(
      "jxa-calendar-count-calendars",
      "/usr/bin/osascript",
      ["-l", "JavaScript", "-e", 'function run(){ const app = Application("Calendar"); return JSON.stringify({calendars: app.calendars().length}); }'],
      LONG_TIMEOUT_MS
    )
  );
  probes.push(
    await runProbe(
      "applescript-reminders-count-lists",
      "/usr/bin/osascript",
      ["-e", 'tell application id "com.apple.reminders" to count lists'],
      LONG_TIMEOUT_MS
    )
  );
  probes.push(
    await runProbe(
      "applescript-reminders-rows-path",
      "/usr/bin/osascript",
      ["-e", REMINDERS_ROWS_APPLESCRIPT],
      LONG_TIMEOUT_MS
    )
  );
  probes.push(
    await runProbe(
      "applescript-calendar-count-calendars",
      "/usr/bin/osascript",
      ["-e", 'tell application id "com.apple.iCal" to count calendars'],
      LONG_TIMEOUT_MS
    )
  );
  probes.push(
    await runProbe(
      "eventkit-authorization-status",
      "/usr/bin/swift",
      [
        "-e",
        'import EventKit; print("event=\\(EKEventStore.authorizationStatus(for: .event).rawValue) reminder=\\(EKEventStore.authorizationStatus(for: .reminder).rawValue)")'
      ],
      LONG_TIMEOUT_MS,
      swiftEnv()
    )
  );
  probes.push(
    await runProbe(
      "eventkit-calendar-count-no-request",
      "/usr/bin/swift",
      ["-e", 'import EventKit; let store = EKEventStore(); print(store.calendars(for: .event).count)'],
      LONG_TIMEOUT_MS,
      swiftEnv()
    )
  );
  probes.push(
    await runProbe(
      "eventkit-reminder-calendar-count-no-request",
      "/usr/bin/swift",
      ["-e", 'import EventKit; let store = EKEventStore(); print(store.calendars(for: .reminder).count)'],
      LONG_TIMEOUT_MS,
      swiftEnv()
    )
  );

  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), platform: process.platform, probes }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
