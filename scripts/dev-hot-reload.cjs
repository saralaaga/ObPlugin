const { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } = require("fs");
const { dirname, join, resolve } = require("path");
const { spawn } = require("child_process");

const repoRoot = resolve(__dirname, "..");
const defaultPluginDir = "/Users/carlos/Coding/testValut/.obsidian/plugins/task-hub";
const pluginDir = resolve(process.env.TASK_HUB_PLUGIN_DIR || defaultPluginDir);

const files = [
  { from: join(repoRoot, "manifest.json"), to: join(pluginDir, "manifest.json"), label: "manifest.json" },
  { from: join(repoRoot, "main.js"), to: join(pluginDir, "main.js"), label: "main.js" },
  { from: join(repoRoot, "src", "styles.css"), to: join(pluginDir, "styles.css"), label: "styles.css" }
];

const optionalFiles = [
  { from: join(repoRoot, "taskhub-apple-helper"), to: join(pluginDir, "taskhub-apple-helper"), label: "taskhub-apple-helper" }
];

let syncTimer;
let lastSignature = "";

function ensurePluginDir() {
  mkdirSync(pluginDir, { recursive: true });
  writeFileSync(join(pluginDir, ".hotreload"), "");
}

function fileSignature() {
  return files
    .filter((file) => existsSync(file.from))
    .map((file) => {
      const stat = statSync(file.from);
      return `${file.label}:${stat.mtimeMs}:${stat.size}`;
    })
    .join("|");
}

function copyPluginFiles() {
  ensurePluginDir();

  const missingRequired = files.filter((file) => !existsSync(file.from));
  if (missingRequired.length > 0) {
    console.log(`Waiting for ${missingRequired.map((file) => file.label).join(", ")}...`);
    return;
  }

  const signature = fileSignature();
  if (signature === lastSignature) {
    return;
  }
  lastSignature = signature;

  for (const file of files) {
    mkdirSync(dirname(file.to), { recursive: true });
    copyFileSync(file.from, file.to);
  }

  for (const file of optionalFiles) {
    if (existsSync(file.from)) {
      copyFileSync(file.from, file.to);
    }
  }

  console.log(`Synced Task Hub to ${pluginDir}`);
}

function scheduleSync() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(copyPluginFiles, 150);
}

ensurePluginDir();

const esbuild = spawn(process.execPath, [join(repoRoot, "esbuild.config.mjs")], {
  cwd: repoRoot,
  stdio: "inherit"
});

const poll = setInterval(scheduleSync, 500);
scheduleSync();

function shutdown(signal) {
  clearInterval(poll);
  clearTimeout(syncTimer);
  esbuild.kill(signal);
}

esbuild.on("exit", (code, signal) => {
  clearInterval(poll);
  clearTimeout(syncTimer);
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
