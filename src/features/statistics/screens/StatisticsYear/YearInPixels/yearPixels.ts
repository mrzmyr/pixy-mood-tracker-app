import padStart from "lodash/padStart";
import type { LogItem } from "@/features/logs";
import { getAverageMood } from "@/lib/utils";

/** One cell of the Year in Pixels grid. */
export interface YearPixel {
  /** `YYYY-MM-DD` of the cell. */
  date: string;
  /** `false` for cells past the end of the month, like February 30. */
  inMonth: boolean;
  /** Average rating of the entries on `date`, `null` without entries. */
  rating: LogItem["rating"] | null;
}

/** Day-of-month rows in the grid. */
const DAY_COUNT = 31;

/**
 * Year in Pixels grid for `year`: 31 rows (day of month), 12 cells each
 * (month). One pass over `items`.
 *
 * Matches entries by the UTC date part of `dateTime`, so entries near
 * midnight can land on a neighboring day outside UTC.
 */
export const buildYearPixels = (
  year: number,
  items: LogItem[]
): YearPixel[][] => {
  const itemsByDay = new Map<string, LogItem[]>();
  for (const item of items) {
    const key = item.dateTime?.split("T")[0];
    if (key === undefined) {
      continue;
    }
    const dayItems = itemsByDay.get(key);
    if (dayItems) {
      dayItems.push(item);
    } else {
      itemsByDay.set(key, [item]);
    }
  }

  const daysInMonth = Array.from({ length: 12 }, (_, month) =>
    new Date(year, month + 1, 0).getDate()
  );

  const rows: YearPixel[][] = [];
  for (let day = 1; day <= DAY_COUNT; day += 1) {
    const row: YearPixel[] = [];
    for (let month = 0; month < 12; month += 1) {
      const date = `${year}-${padStart(`${month + 1}`, 2, "0")}-${padStart(`${day}`, 2, "0")}`;
      const dayItems = itemsByDay.get(date);
      row.push({
        date,
        inMonth: day <= daysInMonth[month],
        rating: dayItems ? getAverageMood(dayItems) : null,
      });
    }
    rows.push(row);
  }
  return rows;
};
