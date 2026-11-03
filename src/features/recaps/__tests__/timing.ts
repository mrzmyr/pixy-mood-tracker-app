import { getSlideDuration } from "../story/timing";
import type { CoverSlide } from "../story/types";

describe("slide duration", () => {
  test("waits on the last slide instead of moving on", () => {
    expect(getSlideDuration({ type: "share", photos: [] }, "month")).toBeNull();
    expect(getSlideDuration({ type: "share", photos: [] }, "week")).toBeNull();
  });

  test("keeps month slides twice as long as week slides", () => {
    const cover: CoverSlide = { type: "cover", checkIns: 7, photos: [] };
    expect(getSlideDuration(cover, "week")).toBe(7000);
    expect(getSlideDuration(cover, "month")).toBe(14_000);
  });

  test("gives the best day the month time in any story", () => {
    expect(
      getSlideDuration({ type: "best-day", date: "2026-10-04" }, "week")
    ).toBe(14_000);
  });
});
