import { getSlideDuration } from "../story/timing";

describe("slide duration", () => {
  test("keeps the last slide twice as long as other slides", () => {
    expect(getSlideDuration({ type: "share", photos: [] })).toBe(14_000);
  });

  test("keeps other slides at 7 seconds", () => {
    expect(getSlideDuration({ type: "cover", checkIns: 7, photos: [] })).toBe(
      7000
    );
  });
});
