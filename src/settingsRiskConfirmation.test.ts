import { TaskHubSettingTab } from "./settings";
import { DEFAULT_SETTINGS } from "./settings";

type ToggleControl = {
  value: boolean;
  onChangeHandler?: (value: boolean) => Promise<void> | void;
  setValue(value: boolean): ToggleControl;
  onChange(handler: (value: boolean) => Promise<void> | void): ToggleControl;
};

const toggles: ToggleControl[] = [];
const settings: Array<{ name?: string; desc?: string; toggle?: ToggleControl }> = [];

type MockSettingInstance = {
  name?: string;
  desc?: string;
  toggle?: ToggleControl;
};

jest.mock(
  "obsidian",
  () => ({
    App: class {},
    PluginSettingTab: class {
      containerEl = {
        empty: jest.fn(),
        createDiv: jest.fn(() => ({
          createEl: jest.fn(() => ({ addEventListener: jest.fn() })),
          createDiv: jest.fn(),
          empty: jest.fn()
        }))
      };
      constructor(
        public app: unknown,
        public plugin: unknown
      ) {}
    },
    Setting: class {
      name?: string;
      desc?: string;
      constructor() {
        settings.push(this);
      }
      setName(name: string) {
        this.name = name;
        return this;
      }
      setDesc(desc: string) {
        this.desc = desc;
        return this;
      }
      setHeading() {
        return this;
      }
      addDropdown() {
        return this;
      }
      addText() {
        return this;
      }
      addTextArea() {
        return this;
      }
      addButton() {
        return this;
      }
      addExtraButton() {
        return this;
      }
      addToggle(build: (toggle: ToggleControl) => void) {
        const toggle: ToggleControl = {
          value: false,
          setValue(value: boolean) {
            this.value = value;
            return this;
          },
          onChange(handler) {
            this.onChangeHandler = handler;
            return this;
          }
        };
        toggles.push(toggle);
        (this as MockSettingInstance).toggle = toggle;
        build(toggle);
        return this;
      }
      then() {
        return this;
      }
    }
  }),
  { virtual: true }
);

describe("TaskHubSettingTab risky Apple Reminders setting", () => {
  beforeEach(() => {
    toggles.length = 0;
    settings.length = 0;
    Object.assign(globalThis, {
      document: {
        createDocumentFragment: () => ({
          append: jest.fn()
        }),
        createElement: () => ({
          className: "",
          textContent: "",
          setAttribute: jest.fn()
        })
      }
    });
  });

  it("requires confirmation before enabling Apple Reminders migration", async () => {
    const plugin = pluginForSettings();
    const tab = new TaskHubSettingTab({} as never, plugin as never);

    plugin.confirmRiskySourceDeletionSetting = jest.fn(async () => false);
    tab.display();
    const settingIndex = settings.findIndex((setting) => setting.name === "Create Apple Reminders from vault tasks");
    const toggle = settings[settingIndex].toggle!;

    await toggle.onChangeHandler?.(true);

    expect(plugin.confirmRiskySourceDeletionSetting).toHaveBeenCalled();
    expect(plugin.settings.localApple.remindersCreateEnabled).toBe(false);
    expect(plugin.saveSettings).not.toHaveBeenCalled();

    plugin.confirmRiskySourceDeletionSetting = jest.fn(async () => true);
    await toggle.onChangeHandler?.(true);

    expect(plugin.settings.localApple.remindersCreateEnabled).toBe(true);
    expect(plugin.saveSettings).toHaveBeenCalled();
  });

  it("requires confirmation before enabling Apple Calendar task sending", async () => {
    const plugin = pluginForSettings();
    plugin.settings.localApple.calendarEnabled = true;
    const tab = new TaskHubSettingTab({} as never, plugin as never);

    plugin.confirmRiskySourceDeletionSetting = jest.fn(async () => false);
    tab.display();
    const settingIndex = settings.findIndex((setting) => setting.name === "Send tasks to Apple Calendar");
    const toggle = settings[settingIndex].toggle!;

    await toggle.onChangeHandler?.(true);

    expect(plugin.confirmRiskySourceDeletionSetting).toHaveBeenCalled();
    expect(plugin.settings.localApple.calendarTaskSendEnabled).toBe(false);
    expect(plugin.saveSettings).not.toHaveBeenCalled();

    plugin.confirmRiskySourceDeletionSetting = jest.fn(async () => true);
    await toggle.onChangeHandler?.(true);

    expect(plugin.settings.localApple.calendarTaskSendEnabled).toBe(true);
    expect(plugin.saveSettings).toHaveBeenCalled();
  });
});

function pluginForSettings() {
  return {
    settings: {
      ...DEFAULT_SETTINGS,
      language: "en" as const,
      localApple: {
        ...DEFAULT_SETTINGS.localApple,
        enabled: true,
        remindersEnabled: true
      }
    },
    localAppleStatus: { state: "never" as const },
    getAppleReminderLists: () => [],
    saveSettings: jest.fn(async () => undefined),
    syncLocalApple: jest.fn(async () => undefined),
    refreshLocalAppleStatus: jest.fn(async () => undefined),
    requestLocalApplePermissions: jest.fn(async () => undefined),
    confirmRiskySourceDeletionSetting: jest.fn(async () => false)
  };
}
