export const DEFAULT_TASK_CREATION_FILE_PATH = "Task Hub.md";

export function normalizeTaskCreationFilePath(path: string | undefined): string {
  const trimmed = (path ?? "").trim();
  const withoutLeadingSlash = trimmed.replace(/^\/+/, "");
  const normalized = normalizeVaultPath(withoutLeadingSlash || DEFAULT_TASK_CREATION_FILE_PATH);
  return normalized.toLowerCase().endsWith(".md") ? normalized : `${normalized}.md`;
}

export function createTaskLine(text: string, dateKey: string): string {
  const taskText = text.replace(/\s+/g, " ").trim();
  return `- [ ] ${taskText} 📅 ${dateKey}`;
}

export function appendTaskToContent(content: string, taskLine: string): string {
  if (!content) return `${taskLine}\n`;
  return `${content}${content.endsWith("\n") ? "" : "\n"}${taskLine}\n`;
}

function normalizeVaultPath(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\.\//, "").replace(/\/$/, "");
}
