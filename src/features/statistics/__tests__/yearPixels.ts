import dayjs from "dayjs";
import padStart from "lodash/padStart";
import { _generateItem } from "@/__tests__/utils";
import type { LogItem } from "@/features/logs";
import { getItemDate } from "@/lib/logDates";
import { getAverageMood } from "@/lib/utils";
import { buildYearPixels } from "../screens/StatisticsYear/YearInPixels/yearPixels";
import type { YearPixel } from "../screens/StatisticsYear/YearInPixels/yearPixels";

/**
 * Grid as Year in Pixels built it before the one-pass builder: filter by
 * local year, then filter all entries again for each of the 372 cells.
 */
const previousYearPixels = (date: dayjs.Dayjs, allItems: LogItem[]) => {
  const items = allItems.filter((item) => date.isSame(item.dateTime, "year"));
  const year = date.year();
  const rows: YearPixel[][] = [];
  for (let dayCount = 1; dayCount <= 31; dayCount += 1) {
    const row: YearPixel[] = [];
    for (let i = 0; i < 12; i += 1) {
      const monthString = `${year}-${padStart(`${i + 1}`, 2, "0")}`;
      const dateString = `${monthString}-${padStart(`${dayCount}`, 2, "0")}`;
      const inThisMonth = dayjs(dateString).month() === i;
      const _items = items.filter(
        (item) => item.dateTime?.split("T")[0] === dateString
      );
      row.push({
        date: dateString,
        inMonth: inThisMonth,
        rating: getAverageMood(_items),
      });
    }
    rows.push(row);
  }
  return rows;
};

/** Entries the year screen passes in: local year by `getItemDate`. */
const currentYearPixels = (date: dayjs.Dayjs, allItems: LogItem[]) => {
  const year = date.format("YYYY");
  return buildYearPixels(
    date.year(),
    allItems.filter((item) => getItemDate(item).startsWith(year))
  );
};

const at = (dateTime: string, rating: LogItem["rating"]) =>
  _generateItem({ dateTime, rating });

/** Fresh entry objects: `getItemDate` caches per object and time zone. */
const fixture = (): LogItem[] => [
  // Several entries on one day, averaged.
  at("2024-03-10T08:00:00.000Z", "very_good"),
  at("2024-03-10T12:00:00.000Z", "bad"),
  at("2024-03-10T20:00:00.000Z", "neutral"),
  // Near midnight UTC: neighbors differ by local day in most zones.
  at("2024-06-14T23:45:00.000Z", "extremely_good"),
  at("2024-06-15T00:15:00.000Z", "extremely_bad"),
  at("2024-06-15T23:59:59.999Z", "good"),
  // Year edges: local year and UTC year can differ.
  at("2023-12-31T23:30:00.000Z", "very_bad"),
  at("2024-01-01T00:30:00.000Z", "good"),
  at("2024-12-31T23:30:00.000Z", "very_good"),
  at("2025-01-01T00:30:00.000Z", "bad"),
  // Leap day and the end of a 30-day month.
  at("2024-02-29T10:00:00.000Z", "neutral"),
  at("2024-04-30T22:00:00.000Z", "good"),
  // Daylight saving switch in Europe and the US.
  at("2024-03-31T01:30:00.000Z", "very_good"),
  at("2024-11-03T06:30:00.000Z", "bad"),
  // Offset in the stored string.
  at("2024-08-01T00:30:00.000+02:00", "very_good"),
];

describe("buildYearPixels()", () => {
  const originalTimeZone = process.env.TZ;

  afterEach(() => {
    process.env.TZ = originalTimeZone;
  });

  test.each([
    "UTC",
    "Europe/Berlin",
    "America/Los_Angeles",
    "Asia/Kolkata",
    "Pacific/Kiritimati",
  ])("matches the previous per-cell filter in %s", (timeZone) => {
    process.env.TZ = timeZone;

    for (const year of ["2023-01-01", "2024-01-01", "2025-01-01"]) {
      const date = dayjs(year);
      expect(currentYearPixels(date, fixture())).toEqual(
        previousYearPixels(date, fixture())
      );
    }
  });

  test("puts entries near midnight on their UTC day", () => {
    process.env.TZ = "Europe/Berlin";
    const rows = currentYearPixels(dayjs("2024-01-01"), fixture());

    // June is month index 5, rows start at day 1.
    expect(rows[13][5]).toMatchObject({
      date: "2024-06-14",
      rating: "extremely_good",
    });
    expect(rows[14][5].rating).toBe(getAverageMood(fixture().slice(4, 6)));
  });

  test("marks cells past the end of the month", () => {
    const leap = buildYearPixels(2024, []);
    const common = buildYearPixels(2023, []);

    expect(leap[28][1]).toMatchObject({ date: "2024-02-29", inMonth: true });
    expect(common[28][1]).toMatchObject({ date: "2023-02-29", inMonth: false });
    expect(common[30][3]).toMatchObject({ date: "2023-04-31", inMonth: false });
  });
});
