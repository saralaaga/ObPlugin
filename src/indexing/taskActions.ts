import type { TaskItem } from "../types";

export type CompletionResult =
  | { status: "updated"; content: string; line: number }
  | { status: "already_completed" }
  | { status: "conflict"; message: string };

const OPEN_TASK_MARKER = /^(\s*)- \[ \]/;
const COMPLETED_TASK_MARKER = /^(\s*)- \[[xX]\]/;
const SEARCH_WINDOW = 5;

export function completeTaskInContent(content: string, task: TaskItem): CompletionResult {
  if (task.completed && lineAt(content, task.line) === task.rawLine) {
    return { status: "already_completed" };
  }

  const lines = content.split(/\r?\n/);
  const direct = tryCompleteAtLine(lines, task.line, task.rawLine);
  if (direct.status !== "conflict") {
    return withContent(direct, lines);
  }

  const nearby = findNearbyLine(lines, task);
  if (nearby === undefined) {
    return {
      status: "conflict",
      message: "The task line changed and Task Hub could not safely identify the original task."
    };
  }

  return withContent(tryCompleteAtLine(lines, nearby, task.rawLine), lines);
}

function tryCompleteAtLine(lines: string[], line: number, rawLine: string): CompletionResult {
  const currentLine = lines[line];
  if (currentLine === undefined) {
    return { status: "conflict", message: "The indexed task line is outside the file." };
  }

  if (currentLine === rawLine) {
    if (COMPLETED_TASK_MARKER.test(currentLine)) {
      return { status: "already_completed" };
    }

    if (!OPEN_TASK_MARKER.test(currentLine)) {
      return { status: "conflict", message: "The indexed line is no longer an open task." };
    }

    lines[line] = currentLine.replace(OPEN_TASK_MARKER, "$1- [x]");
    return { status: "updated", content: "", line };
  }

  return { status: "conflict", message: "The indexed task line no longer matches the file." };
}

function findNearbyLine(lines: string[], task: TaskItem): number | undefined {
  const start = Math.max(0, task.line - SEARCH_WINDOW);
  const end = Math.min(lines.length - 1, task.line + SEARCH_WINDOW);

  for (let index = start; index <= end; index += 1) {
    if (lines[index] === task.rawLine) {
      return index;
    }
  }

  return undefined;
}

function withContent(result: CompletionResult, lines: string[]): CompletionResult {
  if (result.status !== "updated") return result;
  return {
    ...result,
    content: lines.join("\n")
  };
}

function lineAt(content: string, line: number): string | undefined {
  return content.split(/\r?\n/)[line];
}
