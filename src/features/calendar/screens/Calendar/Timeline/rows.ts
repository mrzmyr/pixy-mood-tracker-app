import type { LogItem } from "@/features/logs";
import { getItemDate, getItemTime } from "@/lib/logDates";

/** One timeline list row: a month title or an entry card. */
export type TimelineRow =
  | { type: "month"; key: string; month: string }
  | { type: "entry"; key: string; item: LogItem };

/**
 * Timeline rows, newest entry first. A month row (`YYYY-MM`) comes before
 * the first entry of each month.
 */
export const getTimelineRows = (items: LogItem[]): TimelineRow[] => {
  const sorted = [...items].sort((a, b) => getItemTime(b) - getItemTime(a));
  const rows: TimelineRow[] = [];
  let month: string | null = null;

  for (const item of sorted) {
    const itemMonth = getItemDate(item).slice(0, 7);
    if (itemMonth !== month) {
      month = itemMonth;
      rows.push({ type: "month", key: `month-${itemMonth}`, month: itemMonth });
    }
    rows.push({ type: "entry", key: item.id, item });
  }

  return rows;
};
