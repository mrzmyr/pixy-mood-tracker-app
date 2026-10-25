import {
  getLastEntryAt,
  getQuickCheckInDates,
  getQuickCheckInTimes,
} from "../quick-check-in-schedule";
import type { LogItem } from "@/features/logs";

const schedule = { from: "10:00", until: "18:00", everyHours: 4 };

describe("getQuickCheckInTimes", () => {
  test("runs from the first time every few hours up to the last", () => {
    expect(getQuickCheckInTimes(schedule)).toEqual(["10:00", "14:00", "18:00"]);
    expect(
      getQuickCheckInTimes({ from: "09:30", until: "17:00", everyHours: 3 })
    ).toEqual(["09:30", "12:30", "15:30"]);
  });

  test("has no times when the window ends before it starts", () => {
    expect(
      getQuickCheckInTimes({ from: "18:00", until: "10:00", everyHours: 2 })
    ).toEqual([]);
  });

  test("has no times for a broken stored time", () => {
    expect(
      getQuickCheckInTimes({ from: "late", until: "18:00", everyHours: 2 })
    ).toEqual([]);
  });
});

describe("getQuickCheckInDates", () => {
  test("starts with the next time today, then the following days", () => {
    const dates = getQuickCheckInDates({
      schedule,
      now: new Date(2026, 9, 25, 12, 0),
      lastEntryAt: null,
      slots: 4,
    });

    expect(dates).toEqual([
      new Date(2026, 9, 25, 14, 0),
      new Date(2026, 9, 25, 18, 0),
      new Date(2026, 9, 26, 10, 0),
      new Date(2026, 9, 26, 14, 0),
    ]);
  });

  test("skips times right after a check-in", () => {
    const dates = getQuickCheckInDates({
      schedule,
      now: new Date(2026, 9, 25, 11, 0),
      lastEntryAt: new Date(2026, 9, 25, 10, 30),
      slots: 2,
    });

    // 14:00 is less than 4 hours after 10:30.
    expect(dates).toEqual([
      new Date(2026, 9, 25, 18, 0),
      new Date(2026, 9, 26, 10, 0),
    ]);
  });

  test("never schedules more than the slots", () => {
    const dates = getQuickCheckInDates({
      schedule: { from: "08:00", until: "20:00", everyHours: 2 },
      now: new Date(2026, 9, 25, 0, 0),
      lastEntryAt: null,
    });

    expect(dates).toHaveLength(30);
  });
});

describe("getLastEntryAt", () => {
  test("is the newest entry time", () => {
    // SAFETY: getLastEntryAt reads only `dateTime`.
    const items = [
      { dateTime: "2026-10-20T08:00:00.000Z" },
      { dateTime: "2026-10-24T18:00:00.000Z" },
      { dateTime: "2026-10-22T12:00:00.000Z" },
    ] as LogItem[];

    expect(getLastEntryAt(items)).toEqual(new Date("2026-10-24T18:00:00.000Z"));
    expect(getLastEntryAt([])).toBeNull();
  });
});
