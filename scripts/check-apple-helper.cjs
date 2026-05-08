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

console.log(
  `Apple helper OK: reminders=${parsed.remindersStatus.authorization}, calendar=${parsed.calendarStatus.authorization}`
);
