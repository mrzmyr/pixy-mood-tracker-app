import dayjs from "dayjs";
import {
  formatItemTime,
  formatLocalizedDay,
  getItemDateTitle,
  getShortItemDateTitle,
} from "@/lib/utils";

const PHONE_WIDTH = 390;

describe("getShortItemDateTitle()", () => {
  test("shows the year only outside the current year", () => {
    const thisYear = dayjs().year();
    // A mid-month day in another month: never today or yesterday.
    const otherMonth = dayjs().month() === 5 ? 1 : 5;
    const earlierThisYear = dayjs()
      .month(otherMonth)
      .date(15)
      .hour(20)
      .toISOString();
    const lastYear = dayjs().subtract(1, "year").toISOString();

    expect(getShortItemDateTitle(earlierThisYear)).not.toContain(
      String(thisYear)
    );
    expect(getShortItemDateTitle(lastYear)).toContain(String(thisYear - 1));
  });

  test("stays shorter than the full entry title", () => {
    const dateTime = dayjs().subtract(8, "day").toISOString();

    expect(getShortItemDateTitle(dateTime).length).toBeLessThan(
      getItemDateTitle(dateTime, PHONE_WIDTH).length
    );
  });
});

describe("item date titles", () => {
  test("show only the time for an entry from today", () => {
    const dateTime = dayjs().hour(9).minute(5).toISOString();

    expect(getShortItemDateTitle(dateTime)).toBe(formatItemTime(dateTime));
    expect(getItemDateTitle(dateTime, PHONE_WIDTH)).toBe(
      formatItemTime(dateTime)
    );
  });

  test("keep the day for an entry from yesterday", () => {
    const dateTime = dayjs().subtract(1, "day").hour(9).toISOString();

    expect(getShortItemDateTitle(dateTime)).not.toBe(formatItemTime(dateTime));
    expect(getShortItemDateTitle(dateTime)).toContain(formatItemTime(dateTime));
  });
});

describe("getItemDateTitle()", () => {
  test("drops the weekday in windows narrower than 350 pt", () => {
    const dateTime = dayjs().subtract(8, "day").toISOString();

    expect(getItemDateTitle(dateTime, 320)).toBe(
      getShortItemDateTitle(dateTime)
    );
    expect(getItemDateTitle(dateTime, PHONE_WIDTH)).not.toBe(
      getShortItemDateTitle(dateTime)
    );
  });
});

describe("formatLocalizedDay()", () => {
  const thisYear = dayjs().year();
  const sameYear = new Date(thisYear, 8, 29, 12);
  const otherYear = new Date(thisYear - 1, 8, 29, 12);

  test("orders weekday, day and month by locale", () => {
    expect(formatLocalizedDay(sameYear, "long", "en-US")).toMatch(
      /^\p{L}+, \p{L}+ 29$/u
    );
    expect(formatLocalizedDay(sameYear, "long", "de-DE")).toMatch(
      /^\p{L}+, 29\. \p{L}+$/u
    );
  });

  test("shows the year only outside the current year", () => {
    expect(formatLocalizedDay(sameYear, "short", "en-US")).not.toContain(
      String(thisYear)
    );
    expect(formatLocalizedDay(otherYear, "short", "en-US")).toContain(
      String(thisYear - 1)
    );
    expect(formatLocalizedDay(otherYear, "long", "de-DE")).toContain(
      String(thisYear - 1)
    );
  });
});
