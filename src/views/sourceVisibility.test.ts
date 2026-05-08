import { syncVisibleSources } from "./sourceVisibility";

describe("syncVisibleSources", () => {
  it("does not re-enable a source the user hid", () => {
    const visible = new Set(["vault", "apple-calendar"]);
    const known = new Set(["vault", "apple-calendar"]);

    visible.delete("apple-calendar");
    syncVisibleSources(visible, known, ["vault", "apple-calendar"]);

    expect(visible.has("apple-calendar")).toBe(false);
  });

  it("enables newly discovered sources by default", () => {
    const visible = new Set(["vault"]);
    const known = new Set(["vault"]);

    syncVisibleSources(visible, known, ["vault", "apple-calendar"]);

    expect(visible.has("apple-calendar")).toBe(true);
  });
});
