import dayjs from "dayjs";
import type { LogItem } from "@/features/logs";
import { getPixelRating } from "../screens/StatisticsYear/YearInPixels/pixelRating";
import { _generateItem } from "@/testing/logItem";

// Builds dateTime from local wall-clock time, as the logger does. Outside
// UTC, one of 00:30 and 23:30 falls on a different UTC day.
const entryAt = (localTime: string, rating: LogItem["rating"]) =>
  _generateItem({
    date: localTime.slice(0, 10),
    dateTime: dayjs(localTime).toISOString(),
    rating,
  });

describe("Year in Pixels", () => {
  it("puts entries on their local day, not their UTC day", () => {
    const items = [
      entryAt("2026-03-01T00:30:00", "very_bad"),
      entryAt("2026-03-01T23:30:00", "very_bad"),
      entryAt("2026-03-02T00:30:00", "very_good"),
    ];

    expect(getPixelRating(items, "2026-02-28")).toBeNull();
    expect(getPixelRating(items, "2026-03-01")).toBe("very_bad");
    expect(getPixelRating(items, "2026-03-02")).toBe("very_good");
  });

  it("leaves placeholder items without dateTime off every day", () => {
    // SAFETY: mirrors the placeholder items of YearInPixels/index.tsx.
    const placeholder = { id: "1", date: "2026-03-01" } as LogItem;

    const today = dayjs().format("YYYY-MM-DD");

    expect(getPixelRating([placeholder], today)).toBeNull();
    expect(getPixelRating([placeholder], "2026-03-01")).toBeNull();
  });
});
