import type { TaskItem } from "../types";

export type CompletionMessages = {
  lineChangedConflict: string;
  lineMismatchConflict: string;
  lineNoLongerOpen: string;
  lineOutsideFile: string;
};

export type CompletionAction = "complete" | "reopen";

export type CompletionResult =
  | { status: "updated"; content: string; line: number }
  | { status: "already_in_state" }
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
  messages: CompletionMessages = DEFAULT_COMPLETION_MESSAGES,
  action: CompletionAction = "complete"
): CompletionResult {
  if (isSameTaskInTargetState(lineAt(content, task.line), task.rawLine, action)) {
    return { status: "already_in_state" };
  }

  const lines = content.split(/\r?\n/);
  const direct = tryToggleAtLine(lines, task.line, task.rawLine, messages, action);
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

  return withContent(tryToggleAtLine(lines, nearby, task.rawLine, messages, action), lines);
}

function tryToggleAtLine(
  lines: string[],
  line: number,
  rawLine: string,
  messages: CompletionMessages,
  action: CompletionAction
): CompletionResult {
  const currentLine = lines[line];
  if (currentLine === undefined) {
    return { status: "conflict", message: messages.lineOutsideFile };
  }

  if (currentLine === rawLine) {
    if (hasTargetState(currentLine, action)) {
      return { status: "already_in_state" };
    }

    const marker = action === "complete" ? OPEN_TASK_MARKER : COMPLETED_TASK_MARKER;
    if (!marker.test(currentLine)) {
      return { status: "conflict", message: messages.lineNoLongerOpen };
    }

    lines[line] = currentLine.replace(marker, action === "complete" ? "$1- [x]" : "$1- [ ]");
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

function hasTargetState(line: string, action: CompletionAction): boolean {
  return action === "complete" ? COMPLETED_TASK_MARKER.test(line) : OPEN_TASK_MARKER.test(line);
}

function isSameTaskInTargetState(line: string | undefined, rawLine: string, action: CompletionAction): boolean {
  if (!line) return false;
  return hasTargetState(line, action) && lineBody(line) === lineBody(rawLine);
}

function lineBody(line: string): string {
  return line.replace(OPEN_TASK_MARKER, "").replace(COMPLETED_TASK_MARKER, "");
}
