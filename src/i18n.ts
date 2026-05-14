export type Language = "en" | "zh";

export type TranslationKey =
  | "add"
  | "addIcsSource"
  | "addIcsSourceDesc"
  | "all"
  | "allDay"
  | "and"
  | "anyDate"
  | "applyFilters"
  | "appleReminderAlreadySent"
  | "appleReminderCreateDisabled"
  | "appleReminderCreateVaultOnly"
  | "appleReminderCreated"
  | "appleReminderNoTaskAtCursor"
  | "calendar"
  | "calendarEmpty"
  | "calendarTaskCreation"
  | "calendarTaskCreationDesc"
  | "changed"
  | "clearFilters"
  | "cancel"
  | "completed"
  | "context"
  | "conditionDate"
  | "conditionMatch"
  | "conditionTag"
  | "conditionText"
  | "day"
  | "defaultView"
  | "defaultViewDesc"
  | "event"
  | "events"
  | "externalTaskReadOnly"
  | "externalSourceOpenUnavailable"
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
  | "layers"
  | "linePositionUnavailable"
  | "lineChangedConflict"
  | "lineMismatchConflict"
  | "lineNoLongerOpen"
  | "lineOutsideFile"
  | "localApple"
  | "localAppleError"
  | "localAppleCalendar"
  | "localAppleCalendarColor"
  | "localAppleCalendarColorDesc"
  | "localAppleCalendarDesc"
  | "localAppleCalendarWriteback"
  | "localAppleCalendarWritebackDesc"
  | "localAppleDesc"
  | "localAppleDisabledDesc"
  | "localAppleCheckStatus"
  | "localAppleHelperMissing"
  | "localAppleHelperMissingDesc"
  | "localAppleLookahead"
  | "localAppleLookback"
  | "localApplePermissionAuthorized"
  | "localApplePermissionDenied"
  | "localApplePermissionNotDetermined"
  | "localApplePermissionRestricted"
  | "localAppleReminders"
  | "localAppleRemindersColor"
  | "localAppleRemindersColorDesc"
  | "localAppleRemindersDisabledDesc"
  | "localAppleRemindersDesc"
  | "localAppleRemindersCreate"
  | "localAppleRemindersCreateDesc"
  | "localAppleRemindersWriteback"
  | "localAppleRemindersWritebackDesc"
  | "localAppleRequestAccess"
  | "localAppleNoEnabledTabs"
  | "monday"
  | "month"
  | "more"
  | "markComplete"
  | "markOpen"
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
  | "openSource"
  | "openTaskHub"
  | "opened"
  | "or"
  | "overdue"
  | "parseError"
  | "previous"
  | "rescan"
  | "rescanTaskHub"
  | "remove"
  | "search"
  | "searchTags"
  | "searchTasks"
  | "settingsTitle"
  | "friday"
  | "sendCurrentTaskToAppleReminders"
  | "sendToAppleReminders"
  | "showCompletedByDefault"
  | "showCompletedByDefaultDesc"
  | "showCompletedInView"
  | "skipped"
  | "sourceSearch"
  | "source"
  | "supportedTaskSyntax"
  | "supportedTaskSyntaxDesc"
  | "sync"
  | "synced"
  | "tags"
  | "task"
  | "taskAlreadyCompleted"
  | "taskCompleted"
  | "taskCreated"
  | "taskDateAlreadySet"
  | "taskDateTokenMissing"
  | "taskDateUpdated"
  | "taskCreationFile"
  | "taskCreationFileDesc"
  | "taskCreationTitle"
  | "taskCreationPlaceholder"
  | "taskDetails"
  | "taskHub"
  | "taskReopened"
  | "taskUpdateFailed"
  | "tasks"
  | "tasksIndexed"
  | "thisWeek"
  | "today"
  | "tuesday"
  | "thursday"
  | "sunday"
  | "saturday"
  | "vaultTasks"
  | "week"
  | "weekStartsOn"
  | "weekStartsOnDesc"
  | "wednesday";

const TRANSLATIONS: Record<Language, Record<TranslationKey, string>> = {
  en: {
    add: "Add",
    addIcsSource: "Add ICS source",
    addIcsSourceDesc: "Add a public read-only .ics URL.",
    all: "All",
    allDay: "All day",
    and: "AND",
    anyDate: "Any date",
    applyFilters: "Filter",
    appleReminderAlreadySent: "This task was already sent to Apple Reminders",
    appleReminderCreateDisabled: "Turn on Local Apple, Apple Reminders, and reminder creation in Task Hub settings first.",
    appleReminderCreateVaultOnly: "Only vault Markdown tasks can be sent to Apple Reminders.",
    appleReminderCreated: "Apple Reminder created.",
    appleReminderNoTaskAtCursor: "Place the cursor on a Markdown task first.",
    calendar: "Calendar",
    calendarEmpty: "No tasks or events in this calendar range.",
    calendarTaskCreation: "Create tasks from calendar",
    calendarTaskCreationDesc: "Click empty calendar space to create dated vault tasks.",
    changed: "changed",
    clearFilters: "Clear",
    cancel: "Cancel",
    completed: "Completed",
    context: "Context",
    conditionDate: "Time",
    conditionMatch: "Match",
    conditionTag: "Tag",
    conditionText: "Text",
    day: "Day",
    defaultView: "Default view",
    defaultViewDesc: "View shown when Task Hub opens.",
    event: "Event",
    events: "events",
    externalTaskReadOnly: "External items are read-only unless the matching Apple writeback option is enabled.",
    externalSourceOpenUnavailable: "Task Hub could not open this external source.",
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
    layers: "Layers",
    linePositionUnavailable: "line positioning was not available.",
    lineChangedConflict: "The task line changed and Task Hub could not safely identify the original task.",
    lineMismatchConflict: "The indexed task line no longer matches the file.",
    lineNoLongerOpen: "The indexed line is no longer an open task.",
    lineOutsideFile: "The indexed task line is outside the file.",
    localApple: "Local Apple",
    localAppleError: "Local Apple error",
    localAppleCalendar: "Apple Calendar",
    localAppleCalendarColor: "Apple Calendar color",
    localAppleCalendarColorDesc: "Preview the current calendar color or pick a softer recommended color.",
    localAppleCalendarDesc: "Read local Apple Calendar events into the Task Hub calendar. macOS may ask for permission.",
    localAppleCalendarWriteback: "Reschedule Apple Calendar events",
    localAppleCalendarWritebackDesc:
      "Allow drag-and-drop date changes for local Apple Calendar events. Task Hub preserves each event's time, duration, and all-day status.",
    localAppleCheckStatus: "Check status",
    localAppleDesc:
      "Local Apple integrations read local Reminders and Calendar on macOS. Task Hub only writes Apple Reminders completion status and Apple Calendar event dates when you turn those options on.",
    localAppleDisabledDesc: "Turn on Local Apple to configure local Calendar and Reminders reading.",
    localAppleHelperMissing: "Apple helper missing",
    localAppleHelperMissingDesc: "Install a Task Hub release that includes taskhub-apple-helper.",
    localAppleLookahead: "Calendar lookahead days",
    localAppleLookback: "Calendar lookback days",
    localApplePermissionAuthorized: "Permission granted.",
    localApplePermissionDenied: "Permission denied in macOS Privacy & Security settings.",
    localApplePermissionNotDetermined: "Permission has not been requested.",
    localApplePermissionRestricted: "Permission is restricted on this Mac.",
    localAppleReminders: "Apple Reminders",
    localAppleRemindersColor: "Apple Reminders color",
    localAppleRemindersColorDesc: "Preview the current color or pick a softer recommended color.",
    localAppleRemindersDisabledDesc: "Turn on Apple Reminders to configure local reading, completion writeback, and display color.",
    localAppleRemindersDesc: "Read local Apple Reminders into the task list and dated reminders into the calendar.",
    localAppleRemindersCreate: "Create Apple Reminders from vault tasks",
    localAppleRemindersCreateDesc:
      "Allow Task Hub to create a new Apple Reminder when you explicitly use the command, editor context menu, or task detail action.",
    localAppleRemindersWriteback: "Write completion status to Apple Reminders",
    localAppleRemindersWritebackDesc:
      "Allow Task Hub checkboxes to complete or reopen local Apple Reminders. Task Hub does not delete or edit reminder titles, dates, notes, or tags.",
    localAppleRequestAccess: "Request access",
    localAppleNoEnabledTabs: "Turn on Apple Calendar or Apple Reminders to configure that integration.",
    monday: "Monday",
    month: "Month",
    more: "more",
    markComplete: "Mark complete",
    markOpen: "Mark open",
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
    openSource: "Open source",
    openTaskHub: "Open Task Hub",
    opened: "Opened",
    or: "OR",
    overdue: "Overdue",
    parseError: "Parse error",
    previous: "Prev",
    rescan: "Rescan",
    rescanTaskHub: "Rescan Task Hub",
    remove: "Remove",
    search: "Search",
    searchTags: "Search tags",
    searchTasks: "Search tasks",
    settingsTitle: "Task Hub Settings",
    friday: "Friday",
    sendCurrentTaskToAppleReminders: "Send current task to Apple Reminders",
    sendToAppleReminders: "Send to Apple Reminders",
    showCompletedByDefault: "Show completed tasks by default",
    showCompletedByDefaultDesc: "Completed tasks remain indexed but hidden unless this is enabled.",
    showCompletedInView: "Show completed",
    skipped: "skipped",
    sourceSearch: "Folder or file",
    source: "Source",
    supportedTaskSyntax: "Supported task syntax",
    supportedTaskSyntaxDesc: "Version 1 supports - [ ], - [x], Obsidian tags, 📅 YYYY-MM-DD, and due:: YYYY-MM-DD.",
    sync: "Sync",
    synced: "Synced",
    tags: "Tags",
    task: "Task",
    taskAlreadyCompleted: "Task is already completed.",
    taskCompleted: "Task completed.",
    taskCreated: "Task created.",
    taskDateAlreadySet: "Task is already on that date.",
    taskDateTokenMissing: "The task line does not contain a supported due date.",
    taskDateUpdated: "Task date updated.",
    taskCreationFile: "Task creation file",
    taskCreationFileDesc: "New calendar tasks are appended to this Markdown file.",
    taskCreationTitle: "Create task",
    taskCreationPlaceholder: "Task content",
    taskDetails: "Task details",
    taskHub: "Task Hub",
    taskReopened: "Task reopened.",
    taskUpdateFailed: "Task Hub could not update the task.",
    tasks: "Tasks",
    tasksIndexed: "tasks indexed",
    thisWeek: "This week",
    today: "Today",
    tuesday: "Tuesday",
    thursday: "Thursday",
    sunday: "Sunday",
    saturday: "Saturday",
    vaultTasks: "Vault tasks",
    week: "Week",
    weekStartsOn: "Week starts on",
    weekStartsOnDesc: "Controls week grouping and calendar layout.",
    wednesday: "Wednesday"
  },
  zh: {
    add: "添加",
    addIcsSource: "添加 ICS 日历源",
    addIcsSourceDesc: "添加一个公开、只读的 .ics URL。",
    all: "全部",
    allDay: "全天",
    and: "且",
    anyDate: "任意日期",
    applyFilters: "筛选",
    appleReminderAlreadySent: "这条任务已经发送到 Apple 提醒事项",
    appleReminderCreateDisabled: "请先在 Task Hub 设置中开启本地 Apple、Apple 提醒事项和创建提醒事项。",
    appleReminderCreateVaultOnly: "只有 vault 中的 Markdown 任务可以发送到 Apple 提醒事项。",
    appleReminderCreated: "已创建 Apple 提醒事项。",
    appleReminderNoTaskAtCursor: "请先把光标放在一条 Markdown 任务上。",
    calendar: "日历",
    calendarEmpty: "当前日历范围内没有任务或事件。",
    calendarTaskCreation: "允许从日历创建任务",
    calendarTaskCreationDesc: "点击日历空白区域创建带日期的 vault 任务。",
    changed: "已变化",
    clearFilters: "清空",
    cancel: "取消",
    completed: "已完成",
    context: "上下文",
    conditionDate: "时间",
    conditionMatch: "条件匹配",
    conditionTag: "标签",
    conditionText: "文本",
    day: "日",
    defaultView: "默认视图",
    defaultViewDesc: "打开 Task Hub 时默认显示的视图。",
    event: "事件",
    events: "个事件",
    externalTaskReadOnly: "外部项目默认只读；Apple 提醒事项和 Apple 日历的部分写入能力需要在设置中显式开启。",
    externalSourceOpenUnavailable: "Task Hub 无法打开这个外部来源。",
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
    layers: "图层",
    linePositionUnavailable: "无法定位到具体行。",
    lineChangedConflict: "任务所在行已经变化，Task Hub 无法安全识别原任务。",
    lineMismatchConflict: "索引中的任务行和文件内容不再匹配。",
    lineNoLongerOpen: "索引中的这一行已经不再是未完成任务。",
    lineOutsideFile: "索引中的任务行超出了文件范围。",
    localApple: "本地 Apple",
    localAppleError: "本地 Apple 错误",
    localAppleCalendar: "Apple 日历",
    localAppleCalendarColor: "Apple 日历颜色",
    localAppleCalendarColorDesc: "预览当前日历颜色，或选择一个更柔和的推荐颜色。",
    localAppleCalendarDesc: "读取本机 Apple 日历事件到 Task Hub 日历中。macOS 可能会请求权限。",
    localAppleCalendarWriteback: "拖拽改期 Apple 日历事件",
    localAppleCalendarWritebackDesc: "允许通过拖拽修改本机 Apple 日历事件日期；Task Hub 会保留事件原来的时间、时长和全天状态。",
    localAppleCheckStatus: "检查状态",
    localAppleDesc: "本地 Apple 集成只在 macOS 读取本机提醒事项和日历；只有分别开启写回选项后，才会写入 Apple 提醒事项完成状态和 Apple 日历事件日期。",
    localAppleDisabledDesc: "启用本地 Apple 后再配置本机日历和提醒事项读取。",
    localAppleHelperMissing: "Apple helper 缺失",
    localAppleHelperMissingDesc: "请安装包含 taskhub-apple-helper 的 Task Hub 发布包。",
    localAppleLookahead: "日历向后读取天数",
    localAppleLookback: "日历向前回看天数",
    localApplePermissionAuthorized: "权限已授权。",
    localApplePermissionDenied: "权限已在 macOS 隐私与安全性设置中被拒绝。",
    localApplePermissionNotDetermined: "尚未请求权限。",
    localApplePermissionRestricted: "这台 Mac 限制了该权限。",
    localAppleReminders: "Apple 提醒事项",
    localAppleRemindersColor: "Apple 提醒事项颜色",
    localAppleRemindersColorDesc: "预览当前颜色，或选择一个更柔和的推荐颜色。",
    localAppleRemindersDisabledDesc: "启用 Apple 提醒事项后再配置本地读取、完成状态写入和显示颜色。",
    localAppleRemindersDesc: "读取本机 Apple 提醒事项到任务列表；有日期的提醒也会进入日历。",
    localAppleRemindersCreate: "从 vault 任务创建 Apple 提醒事项",
    localAppleRemindersCreateDesc: "允许在你明确使用命令、编辑器右键菜单或任务详情按钮时，由 Task Hub 创建新的 Apple 提醒事项。",
    localAppleRemindersWriteback: "写入 Apple 提醒事项完成状态",
    localAppleRemindersWritebackDesc: "允许通过 Task Hub 的选择框完成或重新打开本机 Apple 提醒事项；Task Hub 不会删除或编辑提醒事项标题、日期、备注、标签。",
    localAppleRequestAccess: "请求权限",
    localAppleNoEnabledTabs: "开启 Apple 日历或 Apple 提醒事项后，再配置对应集成。",
    monday: "周一",
    month: "月",
    more: "更多",
    markComplete: "标记完成",
    markOpen: "标记未完成",
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
    openSource: "打开源文件",
    openTaskHub: "打开 Task Hub",
    opened: "已打开",
    or: "或",
    overdue: "已逾期",
    parseError: "解析错误",
    previous: "上一页",
    rescan: "重新扫描",
    rescanTaskHub: "重新扫描 Task Hub",
    remove: "删除",
    search: "搜索",
    searchTags: "搜索标签",
    searchTasks: "搜索任务",
    settingsTitle: "Task Hub 设置",
    friday: "周五",
    sendCurrentTaskToAppleReminders: "将当前任务发送到 Apple 提醒事项",
    sendToAppleReminders: "发送到 Apple 提醒事项",
    showCompletedByDefault: "默认显示已完成任务",
    showCompletedByDefaultDesc: "已完成任务仍会被索引；关闭时默认隐藏。",
    showCompletedInView: "显示已完成",
    skipped: "已跳过",
    sourceSearch: "文件夹或文件",
    source: "来源",
    supportedTaskSyntax: "支持的任务语法",
    supportedTaskSyntaxDesc: "版本 1 支持 - [ ]、- [x]、Obsidian 标签、📅 YYYY-MM-DD 和 due:: YYYY-MM-DD。",
    sync: "同步",
    synced: "已同步",
    tags: "标签",
    task: "任务",
    taskAlreadyCompleted: "任务已经完成。",
    taskCompleted: "任务已完成。",
    taskCreated: "任务已创建。",
    taskDateAlreadySet: "任务已经在这个日期。",
    taskDateTokenMissing: "任务行中没有可支持的日期标记。",
    taskDateUpdated: "任务日期已更新。",
    taskCreationFile: "任务创建文件",
    taskCreationFileDesc: "从日历新建的任务会追加到这个 Markdown 文件。",
    taskCreationTitle: "创建任务",
    taskCreationPlaceholder: "任务内容",
    taskDetails: "任务详情",
    taskHub: "Task Hub",
    taskReopened: "任务已重新打开。",
    taskUpdateFailed: "Task Hub 无法更新该任务。",
    tasks: "任务",
    tasksIndexed: "个任务已索引",
    thisWeek: "本周",
    today: "今天",
    tuesday: "周二",
    thursday: "周四",
    sunday: "周日",
    saturday: "周六",
    vaultTasks: "仓库任务",
    week: "周",
    weekStartsOn: "一周开始于",
    weekStartsOnDesc: "控制周分组和日历布局。",
    wednesday: "周三"
  }
};

export type Translator = (key: TranslationKey) => string;

export function createTranslator(language: Language): Translator {
  return (key) => TRANSLATIONS[language][key] ?? TRANSLATIONS.en[key];
}
