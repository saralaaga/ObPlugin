import TaskHubPlugin from "./main";
import { DEFAULT_SETTINGS } from "./settings";
import type { TaskItem } from "./types";

const notices: string[] = [];
const savedData: unknown[] = [];

jest.mock(
  "obsidian",
  () => ({
    ButtonComponent: class {},
    Editor: class {},
    ItemView: class {},
    MarkdownView: class {},
    Menu: class {},
    Modal: class {},
    Notice: class {
      constructor(message: string) {
        notices.push(message);
      }
    },
    Platform: { isDesktopApp: true },
    PluginSettingTab: class {},
    Plugin: class {
      app: unknown;
      manifest = { id: "task-hub", dir: ".obsidian/plugins/task-hub" };
      async loadData() {
        return null;
      }
      async saveData(data: unknown) {
        savedData.push(data);
      }
      addCommand() {}
      addRibbonIcon() {}
      addSettingTab() {}
      registerEvent() {}
      registerView() {}
    },
    requestUrl: jest.fn(),
    Setting: class {},
    TFile: class {},
    WorkspaceLeaf: class {}
  }),
  { virtual: true }
);

jest.mock("./icons", () => ({
  registerTaskHubIcon: jest.fn(),
  TASK_HUB_ICON_ID: "task-hub"
}));

jest.mock("./localApple", () => ({
  appleCalendarSource: jest.fn(),
  appleRemindersSource: jest.fn(),
  configureLocalAppleHelperPath: jest.fn(),
  createAppleReminder: jest.fn(async () => "reminder-created-1"),
  createAppleCalendarEvent: jest.fn(),
  getLocalAppleHelperStatus: jest.fn(),
  installBundledAppleHelper: jest.fn(),
  readAppleCalendarEventsData: jest.fn(),
  readAppleReminderLists: jest.fn(),
  readAppleRemindersData: jest.fn(),
  requestLocalAppleAccess: jest.fn(),
  setAppleCalendarEventDate: jest.fn(),
  setAppleReminderCompleted: jest.fn(),
  setAppleReminderDueDate: jest.fn(),
  setAppleReminderList: jest.fn()
}));

const { createAppleReminder } = jest.requireMock("./localApple");

describe("Apple Reminders migration", () => {
  beforeEach(() => {
    notices.length = 0;
    savedData.length = 0;
    jest.clearAllMocks();
  });

  it("creates the Apple Reminder and then removes the source Markdown task", async () => {
    const file = { path: "Inbox.md", extension: "md", stat: { ctime: 1, mtime: 2, size: 3 } };
    const plugin = new TaskHubPlugin({} as never, {} as never);
    const process = jest.fn(async (_file, update) => update("- [ ] Pay invoice 📅 2026-05-20\nNext"));
    plugin.app = {
      vault: {
        adapter: {},
        getFileByPath: jest.fn(() => file),
        read: jest.fn(async () => "- [ ] Pay invoice 📅 2026-05-20\nNext"),
        process,
        cachedRead: jest.fn(async () => "Next")
      },
      workspace: {
        getLeavesOfType: jest.fn(() => [])
      }
    } as never;
    plugin.settings = {
      ...DEFAULT_SETTINGS,
      localApple: {
        ...DEFAULT_SETTINGS.localApple,
        enabled: true,
        remindersEnabled: true,
        remindersCreateEnabled: true
      }
    };
    plugin.taskIndex = {
      reindexFile: jest.fn(async () => undefined)
    } as never;
    plugin.syncLocalApple = jest.fn(async () => undefined) as never;

    await plugin.sendTaskToAppleReminders(task());

    expect(createAppleReminder).toHaveBeenCalledWith({
      title: "Pay invoice",
      notes: expect.stringContaining("Source: Inbox.md:1"),
      dueDate: "2026-05-20",
      listId: undefined
    });
    await expect(process.mock.results[0].value).resolves.toBe("Next");
    expect(Object.values(plugin.settings.appleReminderLinks)).toContain("reminder-created-1");
    expect(notices).toContain("Apple Reminder created and source task removed.");
  });
});

function task(): TaskItem {
  return {
    id: "Inbox.md:0:904c04a88c5cf4eec11d8e6c5d80860fd24fca31",
    filePath: "Inbox.md",
    line: 0,
    rawLine: "- [ ] Pay invoice 📅 2026-05-20",
    text: "Pay invoice",
    completed: false,
    tags: [],
    dueDate: "2026-05-20",
    source: "vault"
  };
}
