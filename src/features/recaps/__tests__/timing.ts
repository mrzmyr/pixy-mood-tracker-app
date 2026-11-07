import { getSlideDuration } from "../story/timing";
import type { CoverSlide } from "../story/types";

describe("slide duration", () => {
  test("waits on the last slide instead of moving on", () => {
    expect(getSlideDuration({ type: "share", photos: [] })).toBeNull();
  });

  test("moves on from other slides after a while", () => {
    const cover: CoverSlide = { type: "cover", checkIns: 7, photos: [] };
    expect(getSlideDuration(cover)).toBe(14_000);
  });
});
