import { REMINDER_DAYS, getReminderDates } from "../reminderDates";

const NOW = new Date(2024, 0, 10, 12, 0);

describe("getReminderDates()", () => {
  test("skips days that already have an entry", () => {
    const dates = getReminderDates({
      time: "20:00",
      now: NOW,
      loggedDays: new Set(["2024-01-10", "2024-01-12"]),
    });

    expect(dates.slice(0, 3)).toEqual([
      new Date(2024, 0, 11, 20, 0),
      new Date(2024, 0, 13, 20, 0),
      new Date(2024, 0, 14, 20, 0),
    ]);
  });

  test("starts tomorrow when today's reminder time passed", () => {
    const dates = getReminderDates({
      time: "08:30",
      now: NOW,
      loggedDays: new Set(),
    });

    expect(dates[0]).toEqual(new Date(2024, 0, 11, 8, 30));
  });

  test("covers REMINDER_DAYS days from today", () => {
    const dates = getReminderDates({
      time: "20:00",
      now: NOW,
      loggedDays: new Set(),
    });

    expect(dates).toHaveLength(REMINDER_DAYS);
    expect(dates.at(-1)).toEqual(new Date(2024, 0, 10 + REMINDER_DAYS - 1, 20));
  });
});
