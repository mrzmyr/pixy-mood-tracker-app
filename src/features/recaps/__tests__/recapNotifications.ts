import { getWeekLocale } from "@/lib/translation";
import { getRecapNotifications } from "../recapNotifications";
import { WEEK_LOCALE } from "./utils";

const ends = (
  notifications: ReturnType<typeof getRecapNotifications>,
  kind: "week" | "month" | "year"
) =>
  notifications.flatMap((notification) =>
    notification.kind === kind ? [notification.periodEnd] : []
  );

describe("getRecapNotifications", () => {
  // Wednesday 2026-10-07, 12:00 local.
  const now = new Date(2026, 9, 7, 12, 0);

  test("ends weeks on Sunday when weeks start on Monday", () => {
    const notifications = getRecapNotifications({
      now,
      weekLocale: WEEK_LOCALE,
      reminderTime: "20:00",
    });

    expect(ends(notifications, "week")).toEqual([
      "2026-10-11",
      "2026-10-18",
      "2026-10-25",
      "2026-11-01",
    ]);
  });

  test("ends weeks on Saturday when weeks start on Sunday", () => {
    const notifications = getRecapNotifications({
      now,
      weekLocale: getWeekLocale({ weekStart: 0 }),
      reminderTime: "20:00",
    });

    expect(ends(notifications, "week")).toEqual([
      "2026-10-10",
      "2026-10-17",
      "2026-10-24",
      "2026-10-31",
    ]);
  });

  test("ends months on their last day, February included", () => {
    const notifications = getRecapNotifications({
      now: new Date(2027, 0, 15, 12, 0),
      weekLocale: WEEK_LOCALE,
      reminderTime: "20:00",
      months: 4,
    });

    expect(ends(notifications, "month")).toEqual([
      "2027-01-31",
      "2027-02-28",
      "2027-03-31",
      "2027-04-30",
    ]);
  });

  test("ends years on December 31, without quarters", () => {
    const notifications = getRecapNotifications({
      now,
      weekLocale: WEEK_LOCALE,
      reminderTime: "20:00",
      years: 2,
    });

    expect(ends(notifications, "year")).toEqual(["2026-12-31", "2027-12-31"]);
    expect(notifications.map(({ kind }) => kind)).not.toContain("quarter");
  });

  test("sends at the reminder time, sorted by time", () => {
    const notifications = getRecapNotifications({
      now,
      weekLocale: WEEK_LOCALE,
      reminderTime: "08:30",
    });

    expect(notifications[0]).toEqual({
      kind: "week",
      periodEnd: "2026-10-11",
      at: new Date(2026, 9, 11, 8, 30),
    });
    const times = notifications.map(({ at }) => at.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  test("includes today's period end while its time is still ahead", () => {
    const notifications = getRecapNotifications({
      now: new Date(2026, 9, 31, 19, 59),
      weekLocale: WEEK_LOCALE,
      reminderTime: "20:00",
    });

    expect(ends(notifications, "month")[0]).toBe("2026-10-31");
  });

  test("skips today's period end once its time passed", () => {
    const notifications = getRecapNotifications({
      now: new Date(2026, 9, 31, 20, 0),
      weekLocale: WEEK_LOCALE,
      reminderTime: "20:00",
    });

    expect(ends(notifications, "month")).toEqual([
      "2026-11-30",
      "2026-12-31",
      "2027-01-31",
    ]);
  });
});
