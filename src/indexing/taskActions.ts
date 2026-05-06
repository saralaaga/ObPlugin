import type { TaskItem } from "../types";

export type CompletionMessages = {
  lineChangedConflict: string;
  lineMismatchConflict: string;
  lineNoLongerOpen: string;
  lineOutsideFile: string;
};

export type CompletionResult =
  | { status: "updated"; content: string; line: number }
  | { status: "already_completed" }
  | { status: "conflict"; message: string };

const OPEN_TASK_MARKER = /^(\s*)- \[ \]/;
const COMPLETED_TASK_MARKER = /^(\s*)- \[[xX]\]/;
const SEARCH_WINDOW = 5;
const DEFAULT_COMPLETION_MESSAGES: CompletionMessages = {
  lineChangedConflict: "The task line changed and Task Hub could not safely identify the original task.",
  lineMismatchConflict: "The indexed task line no longer matches the file.",
  lineNoLongerOpen: "The indexed line is no longer an open task.",
  lineOutsideFile: "The indexed task line is outside the file."
};

export function completeTaskInContent(
  content: string,
  task: TaskItem,
  messages: CompletionMessages = DEFAULT_COMPLETION_MESSAGES
): CompletionResult {
  if (task.completed && lineAt(content, task.line) === task.rawLine) {
    return { status: "already_completed" };
  }

  const lines = content.split(/\r?\n/);
  const direct = tryCompleteAtLine(lines, task.line, task.rawLine, messages);
  if (direct.status !== "conflict") {
    return withContent(direct, lines);
  }

  const nearby = findNearbyLine(lines, task);
  if (nearby === undefined) {
    return {
      status: "conflict",
      message: messages.lineChangedConflict
    };
  }

  return withContent(tryCompleteAtLine(lines, nearby, task.rawLine, messages), lines);
}

function tryCompleteAtLine(lines: string[], line: number, rawLine: string, messages: CompletionMessages): CompletionResult {
  const currentLine = lines[line];
  if (currentLine === undefined) {
    return { status: "conflict", message: messages.lineOutsideFile };
  }

  if (currentLine === rawLine) {
    if (COMPLETED_TASK_MARKER.test(currentLine)) {
      return { status: "already_completed" };
    }

    if (!OPEN_TASK_MARKER.test(currentLine)) {
      return { status: "conflict", message: messages.lineNoLongerOpen };
    }

    lines[line] = currentLine.replace(OPEN_TASK_MARKER, "$1- [x]");
    return { status: "updated", content: "", line };
  }

  return { status: "conflict", message: messages.lineMismatchConflict };
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
