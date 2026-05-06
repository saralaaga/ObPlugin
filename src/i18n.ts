export type Language = "en" | "zh";

export type TranslationKey =
  | "add"
  | "addIcsSource"
  | "addIcsSourceDesc"
  | "all"
  | "allDay"
  | "anyDate"
  | "calendar"
  | "calendarEmpty"
  | "changed"
  | "completed"
  | "day"
  | "defaultView"
  | "defaultViewDesc"
  | "event"
  | "events"
  | "externalTaskReadOnly"
  | "externalCalendars"
  | "failedSync"
  | "failed"
  | "fileNotFound"
  | "filters"
  | "future"
  | "httpError"
  | "ignoredPaths"
  | "ignoredPathsDesc"
  | "invalidContent"
  | "indexOnStartup"
  | "indexOnStartupDesc"
  | "language"
  | "languageDesc"
  | "lastScan"
  | "linePositionUnavailable"
  | "lineChangedConflict"
  | "lineMismatchConflict"
  | "lineNoLongerOpen"
  | "lineOutsideFile"
  | "localApple"
  | "localAppleCalendar"
  | "localAppleCalendarDesc"
  | "localAppleDesc"
  | "localAppleLookahead"
  | "localAppleLookback"
  | "localAppleReminders"
  | "localAppleRemindersDesc"
  | "monday"
  | "month"
  | "more"
  | "name"
  | "neverSynced"
  | "networkError"
  | "next"
  | "noMatchingTasks"
  | "noOpenTasks"
  | "noTags"
  | "noDate"
  | "notSynced"
  | "open"
  | "openTaskHub"
  | "opened"
  | "overdue"
  | "parseError"
  | "previous"
  | "rescan"
  | "rescanTaskHub"
  | "remove"
  | "searchTasks"
  | "settingsTitle"
  | "showCompletedByDefault"
  | "showCompletedByDefaultDesc"
  | "skipped"
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
  | "sunday"
  | "vaultTasks"
  | "week"
  | "weekStartsOn"
  | "weekStartsOnDesc";

const TRANSLATIONS: Record<Language, Record<TranslationKey, string>> = {
  en: {
    add: "Add",
    addIcsSource: "Add ICS source",
    addIcsSourceDesc: "Add a public read-only .ics URL.",
    all: "All",
    allDay: "All day",
    anyDate: "Any date",
    calendar: "Calendar",
    calendarEmpty: "No tasks or events in this calendar range.",
    changed: "changed",
    completed: "Completed",
    day: "Day",
    defaultView: "Default view",
    defaultViewDesc: "View shown when Task Hub opens.",
    event: "Event",
    events: "events",
    externalTaskReadOnly: "External tasks are read-only in Task Hub.",
    externalCalendars: "External calendars",
    failed: "failed",
    failedSync: "Failed to sync",
    fileNotFound: "File not found",
    filters: "Filters",
    future: "Future",
    httpError: "HTTP error",
    ignoredPaths: "Ignored paths",
    ignoredPathsDesc: "Comma-separated folder or file prefixes.",
    invalidContent: "Invalid content",
    indexOnStartup: "Index on startup",
    indexOnStartupDesc: "Scan changed Markdown files when Obsidian starts.",
    language: "Language",
    languageDesc: "Choose the UI language for Task Hub.",
    lastScan: "Last scan",
    linePositionUnavailable: "line positioning was not available.",
    lineChangedConflict: "The task line changed and Task Hub could not safely identify the original task.",
    lineMismatchConflict: "The indexed task line no longer matches the file.",
    lineNoLongerOpen: "The indexed line is no longer an open task.",
    lineOutsideFile: "The indexed task line is outside the file.",
    localApple: "Local Apple",
    localAppleCalendar: "Apple Calendar",
    localAppleCalendarDesc: "Read local Apple Calendar events into the Task Hub calendar. macOS may ask for permission.",
    localAppleDesc: "Local Apple integrations are read-only and only work in Obsidian desktop on macOS.",
    localAppleLookahead: "Calendar lookahead days",
    localAppleLookback: "Calendar lookback days",
    localAppleReminders: "Apple Reminders",
    localAppleRemindersDesc: "Read local Apple Reminders into the task list and dated reminders into the calendar.",
    monday: "Monday",
    month: "Month",
    more: "more",
    name: "Name",
    neverSynced: "Never synced",
    networkError: "Network error",
    next: "Next",
    noMatchingTasks: "No tasks match the current filters.",
    noOpenTasks: "No open tasks found in the indexed vault.",
    noTags: "No tags found in indexed tasks.",
    noDate: "No date",
    notSynced: "not synced",
    open: "Open",
    openTaskHub: "Open Task Hub",
    opened: "Opened",
    overdue: "Overdue",
    parseError: "Parse error",
    previous: "Prev",
    rescan: "Rescan",
    rescanTaskHub: "Rescan Task Hub",
    remove: "Remove",
    searchTasks: "Search tasks",
    settingsTitle: "Task Hub Settings",
    showCompletedByDefault: "Show completed tasks by default",
    showCompletedByDefaultDesc: "Completed tasks remain indexed but hidden unless this is enabled.",
    skipped: "skipped",
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
    sunday: "Sunday",
    vaultTasks: "Vault tasks",
    week: "Week",
    weekStartsOn: "Week starts on",
    weekStartsOnDesc: "Controls week grouping and calendar layout."
  },
  zh: {
    add: "添加",
    addIcsSource: "添加 ICS 日历源",
    addIcsSourceDesc: "添加一个公开、只读的 .ics URL。",
    all: "全部",
    allDay: "全天",
    anyDate: "任意日期",
    calendar: "日历",
    calendarEmpty: "当前日历范围内没有任务或事件。",
    changed: "已变化",
    completed: "已完成",
    day: "日",
    defaultView: "默认视图",
    defaultViewDesc: "打开 Task Hub 时默认显示的视图。",
    event: "事件",
    events: "个事件",
    externalTaskReadOnly: "外部任务在 Task Hub 中是只读的。",
    externalCalendars: "外部日历",
    failed: "失败",
    failedSync: "同步失败",
    fileNotFound: "文件未找到",
    filters: "筛选",
    future: "未来",
    httpError: "HTTP 错误",
    ignoredPaths: "忽略路径",
    ignoredPathsDesc: "用逗号分隔的文件夹或文件路径前缀。",
    invalidContent: "内容无效",
    indexOnStartup: "启动时索引",
    indexOnStartupDesc: "Obsidian 启动时扫描发生变化的 Markdown 文件。",
    language: "语言",
    languageDesc: "选择 Task Hub 的界面语言。",
    lastScan: "上次扫描",
    linePositionUnavailable: "无法定位到具体行。",
    lineChangedConflict: "任务所在行已经变化，Task Hub 无法安全识别原任务。",
    lineMismatchConflict: "索引中的任务行和文件内容不再匹配。",
    lineNoLongerOpen: "索引中的这一行已经不再是未完成任务。",
    lineOutsideFile: "索引中的任务行超出了文件范围。",
    localApple: "本地 Apple",
    localAppleCalendar: "Apple 日历",
    localAppleCalendarDesc: "读取本机 Apple 日历事件到 Task Hub 日历中。macOS 可能会请求权限。",
    localAppleDesc: "本地 Apple 集成为只读能力，并且只支持 macOS 上的 Obsidian 桌面版。",
    localAppleLookahead: "日历向后读取天数",
    localAppleLookback: "日历向前回看天数",
    localAppleReminders: "Apple 提醒事项",
    localAppleRemindersDesc: "读取本机 Apple 提醒事项到任务列表；有日期的提醒也会进入日历。",
    monday: "周一",
    month: "月",
    more: "更多",
    name: "名称",
    neverSynced: "从未同步",
    networkError: "网络错误",
    next: "下一页",
    noMatchingTasks: "没有符合当前筛选条件的任务。",
    noOpenTasks: "当前索引的仓库中没有未完成任务。",
    noTags: "索引任务中没有标签。",
    noDate: "无日期",
    notSynced: "未同步",
    open: "未完成",
    openTaskHub: "打开 Task Hub",
    opened: "已打开",
    overdue: "已逾期",
    parseError: "解析错误",
    previous: "上一页",
    rescan: "重新扫描",
    rescanTaskHub: "重新扫描 Task Hub",
    remove: "删除",
    searchTasks: "搜索任务",
    settingsTitle: "Task Hub 设置",
    showCompletedByDefault: "默认显示已完成任务",
    showCompletedByDefaultDesc: "已完成任务仍会被索引；关闭时默认隐藏。",
    skipped: "已跳过",
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
    sunday: "周日",
    vaultTasks: "仓库任务",
    week: "周",
    weekStartsOn: "一周开始于",
    weekStartsOnDesc: "控制周分组和日历布局。"
  }
};

export type Translator = (key: TranslationKey) => string;

export function createTranslator(language: Language): Translator {
  return (key) => TRANSLATIONS[language][key] ?? TRANSLATIONS.en[key];
}
