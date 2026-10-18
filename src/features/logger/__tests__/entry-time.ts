import dayjs from "dayjs";
import { clampToNow, getPresetDateTime } from "../entry-time";

const at = (value: string) => dayjs(value).toDate();

describe("getPresetDateTime", () => {
  test("Evening on a past day sets 20:00 that day", () => {
    const result = getPresetDateTime({
      dateTime: dayjs("2026-03-10T09:37").toISOString(),
      hour: 20,
      now: at("2026-03-12T10:00"),
    });

    expect(result).toBe(dayjs("2026-03-10T20:00").toISOString());
  });

  test("Morning today keeps the day and clears minutes", () => {
    const result = getPresetDateTime({
      dateTime: dayjs("2026-03-12T09:37").toISOString(),
      hour: 8,
      now: at("2026-03-12T09:40"),
    });

    expect(result).toBe(dayjs("2026-03-12T08:00").toISOString());
  });

  test("Evening today before 20:00 is unavailable, never a future time", () => {
    const result = getPresetDateTime({
      dateTime: dayjs("2026-03-12T09:37").toISOString(),
      hour: 20,
      now: at("2026-03-12T10:00"),
    });

    expect(result).toBeNull();
  });

  test("a preset at the current hour is still available", () => {
    const result = getPresetDateTime({
      dateTime: dayjs("2026-03-12T13:05").toISOString(),
      hour: 13,
      now: at("2026-03-12T13:00"),
    });

    expect(result).toBe(dayjs("2026-03-12T13:00").toISOString());
  });
});

describe("clampToNow", () => {
  test("moves a future pick back to now", () => {
    const now = at("2026-03-12T10:00");

    expect(clampToNow(at("2026-03-12T18:30"), now)).toBe(now);
  });

  test("keeps a past pick", () => {
    const past = at("2026-03-11T18:30");

    expect(clampToNow(past, at("2026-03-12T10:00"))).toBe(past);
  });
});
