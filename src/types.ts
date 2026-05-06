export type TaskStatusFilter = "open" | "completed" | "all";
export type DefaultView = "tasks" | "calendar" | "tags";
export type WeekStart = "monday" | "sunday";

export type TaskItem = {
  id: string;
  filePath: string;
  line: number;
  rawLine: string;
  text: string;
  completed: boolean;
  tags: string[];
  dueDate?: string;
  heading?: string;
  contextPreview?: string;
  source: "vault";
  scheduledDate?: string;
  startDate?: string;
  priority?: string;
  recurrence?: string;
  createdDate?: string;
  completedDate?: string;
};

export type CalendarEvent = {
  id: string;
  sourceId: string;
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  location?: string;
  description?: string;
  url?: string;
};

export type CalendarSourceStatus =
  | { state: "ok"; lastSyncedAt: string; eventCount: number }
  | {
      state: "error";
      errorType: "network_error" | "http_error" | "invalid_content" | "parse_error";
      message: string;
      statusCode?: number;
      lastAttemptAt: string;
      lastSuccessfulSyncAt?: string;
    }
  | { state: "never" };

export type CalendarSource = {
  id: string;
  name: string;
  type: "ics";
  url: string;
  color: string;
  enabled: boolean;
  refreshIntervalMinutes: number;
  status: CalendarSourceStatus;
};

export type IndexedFileState = {
  path: string;
  ctime: number;
  mtime: number;
  size: number;
  taskIds: string[];
  lastIndexedAt: string;
  lastError?: string;
};

export type TaskHubSettings = {
  defaultView: DefaultView;
  weekStart: WeekStart;
  showCompletedByDefault: boolean;
  indexOnStartup: boolean;
  ignoredPaths: string[];
  calendarSources: CalendarSource[];
};
