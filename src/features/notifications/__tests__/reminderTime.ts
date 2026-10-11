import { formatLockScreenTime } from "../reminderTime";

const EVENING = new Date(2024, 0, 10, 20, 5);
const MORNING = new Date(2024, 0, 10, 8, 30);

describe("formatLockScreenTime()", () => {
  test("12-hour locales drop the day period", () => {
    expect(formatLockScreenTime(EVENING, "en-US")).toBe("8:05");
    expect(formatLockScreenTime(MORNING, "en-US")).toBe("8:30");
  });

  test("drops a day period that comes before the time", () => {
    expect(formatLockScreenTime(EVENING, "ko-KR")).toBe("8:05");
  });

  test("24-hour locales keep the full time", () => {
    expect(formatLockScreenTime(EVENING, "de-DE")).toBe("20:05");
  });
});
