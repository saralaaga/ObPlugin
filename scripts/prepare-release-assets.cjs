const { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } = require("fs");
const { join } = require("path");

const root = process.cwd();
const dist = join(root, "dist");
const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

copyFileSync(join(root, "main.js"), join(dist, "main.js"));
copyFileSync(join(root, "manifest.json"), join(dist, "manifest.json"));
copyFileSync(join(root, "src", "styles.css"), join(dist, "styles.css"));

const appleHelper = join(root, "taskhub-apple-helper");
if (existsSync(appleHelper)) {
  const distAppleHelper = join(dist, "taskhub-apple-helper");
  copyFileSync(appleHelper, distAppleHelper);
  chmodSync(distAppleHelper, 0o755);
}

console.log(`Prepared Obsidian release assets in dist/ for Task Hub ${manifest.version}.`);
console.log("Upload main.js, manifest.json, and styles.css to the GitHub release.");
if (existsSync(appleHelper)) {
  console.log("Included taskhub-apple-helper in dist/ for manual/local packages that support Local Apple integration.");
} else {
  console.log("Skipped taskhub-apple-helper because it has not been built. Run npm run build:apple-helper on macOS if this release package needs Local Apple integration.");
}
