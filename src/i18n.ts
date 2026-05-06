export type Language = "en" | "zh";

export type TranslationKey =
  | "addIcsSource"
  | "all"
  | "anyDate"
  | "calendar"
  | "calendarEmpty"
  | "completed"
  | "defaultView"
  | "defaultViewDesc"
  | "event"
  | "externalCalendars"
  | "failedSync"
  | "fileNotFound"
  | "filters"
  | "future"
  | "ignoredPaths"
  | "ignoredPathsDesc"
  | "indexOnStartup"
  | "indexOnStartupDesc"
  | "language"
  | "languageDesc"
  | "lastScan"
  | "linePositionUnavailable"
  | "neverSynced"
  | "noMatchingTasks"
  | "noOpenTasks"
  | "noTags"
  | "noDate"
  | "notSynced"
  | "open"
  | "overdue"
  | "rescan"
  | "remove"
  | "searchTasks"
  | "settingsTitle"
  | "showCompletedByDefault"
  | "showCompletedByDefaultDesc"
  | "sourceSearch"
  | "supportedTaskSyntax"
  | "supportedTaskSyntaxDesc"
  | "sync"
  | "synced"
  | "tags"
  | "task"
  | "taskAlreadyCompleted"
  | "taskCompleted"
  | "taskHub"
  | "taskUpdateFailed"
  | "tasks"
  | "tasksIndexed"
  | "thisWeek"
  | "today"
  | "vaultTasks"
  | "weekStartsOn"
  | "weekStartsOnDesc";

const TRANSLATIONS: Record<Language, Record<TranslationKey, string>> = {
  en: {
    addIcsSource: "Add ICS source",
    all: "All",
    anyDate: "Any date",
    calendar: "Calendar",
    calendarEmpty: "No tasks or events in this calendar range.",
    completed: "Completed",
    defaultView: "Default view",
    defaultViewDesc: "View shown when Task Hub opens.",
    event: "Event",
    externalCalendars: "External calendars",
    failedSync: "Failed to sync",
    fileNotFound: "File not found",
    filters: "Filters",
    future: "Future",
    ignoredPaths: "Ignored paths",
    ignoredPathsDesc: "Comma-separated folder or file prefixes.",
    indexOnStartup: "Index on startup",
    indexOnStartupDesc: "Scan changed Markdown files when Obsidian starts.",
    language: "Language",
    languageDesc: "Choose the UI language for Task Hub.",
    lastScan: "Last scan",
    linePositionUnavailable: "line positioning was not available.",
    neverSynced: "Never synced",
    noMatchingTasks: "No tasks match the current filters.",
    noOpenTasks: "No open tasks found in the indexed vault.",
    noTags: "No tags found in indexed tasks.",
    noDate: "No date",
    notSynced: "not synced",
    open: "Open",
    overdue: "Overdue",
    rescan: "Rescan",
    remove: "Remove",
    searchTasks: "Search tasks",
    settingsTitle: "Task Hub Settings",
    showCompletedByDefault: "Show completed tasks by default",
    showCompletedByDefaultDesc: "Completed tasks remain indexed but hidden unless this is enabled.",
    sourceSearch: "Folder or file",
    supportedTaskSyntax: "Supported task syntax",
    supportedTaskSyntaxDesc: "Version 1 supports - [ ], - [x], Obsidian tags, 📅 YYYY-MM-DD, and due:: YYYY-MM-DD.",
    sync: "Sync",
    synced: "Synced",
    tags: "Tags",
    task: "Task",
    taskAlreadyCompleted: "Task is already completed.",
    taskCompleted: "Task completed.",
    taskHub: "Task Hub",
    taskUpdateFailed: "Task Hub could not update the task.",
    tasks: "Tasks",
    tasksIndexed: "tasks indexed",
    thisWeek: "This week",
    today: "Today",
    vaultTasks: "Vault tasks",
    weekStartsOn: "Week starts on",
    weekStartsOnDesc: "Controls week grouping and calendar layout."
  },
  zh: {
    addIcsSource: "添加 ICS 日历源",
    all: "全部",
    anyDate: "任意日期",
    calendar: "日历",
    calendarEmpty: "当前日历范围内没有任务或事件。",
    completed: "已完成",
    defaultView: "默认视图",
    defaultViewDesc: "打开 Task Hub 时默认显示的视图。",
    event: "事件",
    externalCalendars: "外部日历",
    failedSync: "同步失败",
    fileNotFound: "文件未找到",
    filters: "筛选",
    future: "未来",
    ignoredPaths: "忽略路径",
    ignoredPathsDesc: "用逗号分隔的文件夹或文件路径前缀。",
    indexOnStartup: "启动时索引",
    indexOnStartupDesc: "Obsidian 启动时扫描发生变化的 Markdown 文件。",
    language: "语言",
    languageDesc: "选择 Task Hub 的界面语言。",
    lastScan: "上次扫描",
    linePositionUnavailable: "无法定位到具体行。",
    neverSynced: "从未同步",
    noMatchingTasks: "没有符合当前筛选条件的任务。",
    noOpenTasks: "当前索引的仓库中没有未完成任务。",
    noTags: "索引任务中没有标签。",
    noDate: "无日期",
    notSynced: "未同步",
    open: "未完成",
    overdue: "已逾期",
    rescan: "重新扫描",
    remove: "删除",
    searchTasks: "搜索任务",
    settingsTitle: "Task Hub 设置",
    showCompletedByDefault: "默认显示已完成任务",
    showCompletedByDefaultDesc: "已完成任务仍会被索引；关闭时默认隐藏。",
    sourceSearch: "文件夹或文件",
    supportedTaskSyntax: "支持的任务语法",
    supportedTaskSyntaxDesc: "版本 1 支持 - [ ]、- [x]、Obsidian 标签、📅 YYYY-MM-DD 和 due:: YYYY-MM-DD。",
    sync: "同步",
    synced: "已同步",
    tags: "标签",
    task: "任务",
    taskAlreadyCompleted: "任务已经完成。",
    taskCompleted: "任务已完成。",
    taskHub: "Task Hub",
    taskUpdateFailed: "Task Hub 无法更新该任务。",
    tasks: "任务",
    tasksIndexed: "个任务已索引",
    thisWeek: "本周",
    today: "今天",
    vaultTasks: "仓库任务",
    weekStartsOn: "一周开始于",
    weekStartsOnDesc: "控制周分组和日历布局。"
  }
};

export type Translator = (key: TranslationKey) => string;

export function createTranslator(language: Language): Translator {
  return (key) => TRANSLATIONS[language][key] ?? TRANSLATIONS.en[key];
}
