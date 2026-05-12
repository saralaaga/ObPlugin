import { addIcon } from "obsidian";
import { registerTaskHubIcon, TASK_HUB_ICON_ID } from "./icons";

jest.mock("obsidian", () => ({
  addIcon: jest.fn()
}), { virtual: true });

describe("registerTaskHubIcon", () => {
  it("registers the custom Task Hub ribbon icon", () => {
    registerTaskHubIcon();

    expect(addIcon).toHaveBeenCalledWith(TASK_HUB_ICON_ID, expect.stringContaining("<svg"));
    expect(addIcon).toHaveBeenCalledWith(TASK_HUB_ICON_ID, expect.stringContaining("M15.25 15.75 17.25 17.75 20 14.25"));
  });
});
