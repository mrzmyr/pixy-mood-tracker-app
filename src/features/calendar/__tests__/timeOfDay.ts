import dayjs from "dayjs";
import { getTimeOfDay } from "../screens/LogList/timeOfDay";

const at = (hour: number, minute = 0) =>
  dayjs("2026-10-06").hour(hour).minute(minute).toISOString();

describe("getTimeOfDay", () => {
  test.each([
    [0, 0, "night"],
    [4, 59, "night"],
    [5, 0, "morning"],
    [10, 59, "morning"],
    [11, 0, "midday"],
    [13, 59, "midday"],
    [14, 0, "afternoon"],
    [17, 59, "afternoon"],
    [18, 0, "evening"],
    [21, 59, "evening"],
    [22, 0, "night"],
    [23, 59, "night"],
  ])("%i:%i is %s", (hour, minute, expected) => {
    expect(getTimeOfDay(at(hour, minute))).toBe(expected);
  });
});
