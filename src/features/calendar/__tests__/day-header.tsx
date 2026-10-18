import { getCloseSlot } from "../screens/log-list/close-slot";

describe("day view header", () => {
  it("puts close before the title on Android", () => {
    expect(getCloseSlot("android")).toBe("headerLeft");
  });

  it("keeps close after the title on iOS", () => {
    expect(getCloseSlot("ios")).toBe("headerRight");
  });
});
