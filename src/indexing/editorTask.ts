import { parseTasksFromMarkdown } from "../parsing/taskParser";
import type { TaskItem } from "../types";

export type EditorTaskInput = {
  filePath: string;
  content: string;
  line: number;
};

export function parseTaskAtLine(input: EditorTaskInput): TaskItem | undefined {
  return parseTasksFromMarkdown({ filePath: input.filePath, content: input.content }).find((task) => task.line === input.line);
}
