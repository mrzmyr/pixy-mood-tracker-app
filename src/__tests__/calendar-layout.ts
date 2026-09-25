import dayjs from "dayjs";
import "dayjs/locale/en-gb";
import { getGeometry, getMonths } from "../screens/Calendar/layout";

describe("calendar layout", () => {
  test.each([
    ["2015-02-01", "en", 4],
    ["2021-02-01", "en-gb", 4],
    ["2024-02-01", "en", 5],
    ["2026-08-01", "en", 6],
    ["2026-02-01", "en-gb", 5],
  ])("%s in %s has %i rows", (end, locale, weeks) => {
    expect(getMonths({ end, locale, count: 1 })).toEqual([
      { date: end, weeks },
    ]);
  });

  test("prepending preserves every existing month and its row count", () => {
    const end = "2026-09-01";
    const initial = getMonths({ end, locale: "en", count: 13 });
    const extended = getMonths({ end, locale: "en", count: 1213 });
    expect(extended.slice(-13)).toEqual(initial);
    expect(extended.at(-1)?.date).toBe(end);
    expect(new Set(extended.map(({ date }) => date)).size).toBe(1213);
  });

  test("every day fits exactly one row over a century in both week-start locales", () => {
    for (const locale of ["en", "en-gb"]) {
      const months = getMonths({ end: "2026-12-01", count: 1200, locale });
      for (const { date, weeks } of months) {
        const month = dayjs(date).locale(locale);
        const first = month.startOf("week");
        const last = month.endOf("month").startOf("day");
        const days = last.diff(first, "day") + 1;
        expect(days).toBeLessThanOrEqual(weeks * 7);
        expect(days).toBeGreaterThan((weeks - 1) * 7);
      }
    }
  });

  test.each([320, 390, 768])(
    "square day grid at width %i includes margins",
    (width) => {
      for (const isAndroid of [false, true]) {
        const { weekHeight, titleHeight } = getGeometry({
          width,
          fontScale: 1,
          isAndroid,
        });
        const gridWidth = width - 32 - (isAndroid ? 2 : 0) + 8;
        expect(weekHeight * 7).toBeCloseTo(gridWidth);
        expect(titleHeight).toBe(50);
        const scaled = getGeometry({ width, fontScale: 2, isAndroid });
        expect(scaled.weekHeight).toBe(weekHeight);
        expect(scaled.titleHeight).toBe(72);
      }
    }
  );
});
