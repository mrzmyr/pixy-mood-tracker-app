import dayjs from "dayjs";
import type { LogItem } from "@/features/logs";
import type { Person } from "./PeopleProvider";

/** Window of recent entries that decides the chip order. */
export const USAGE_WINDOW_DAYS = 90;

/**
 * Most used in the last {@link USAGE_WINDOW_DAYS} days first, then by name.
 * Keeps the list stable for people with equal use.
 */
export const sortPeopleByUsage = <T extends Pick<Person, "id" | "name">>(
  people: T[],
  items: Pick<LogItem, "dateTime" | "people">[],
  now = dayjs()
): T[] => {
  const since = now.subtract(USAGE_WINDOW_DAYS, "day").valueOf();
  const counts = new Map<string, number>();
  for (const item of items) {
    if (dayjs(item.dateTime).valueOf() < since) {
      continue;
    }
    for (const reference of item.people) {
      counts.set(reference.id, (counts.get(reference.id) ?? 0) + 1);
    }
  }
  return [...people].sort((a, b) => {
    const diff = (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0);
    return diff === 0 ? a.name.localeCompare(b.name) : diff;
  });
};
