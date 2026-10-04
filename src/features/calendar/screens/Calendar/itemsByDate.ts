import { useMemo } from "react";
import { useCalendarFilters } from "../../filters";
import { useLogState } from "@/features/logs";
import type { LogItem } from "@/features/logs";
import { getItemDate } from "@/lib/logDates";

/** Entries grouped by local day (`DATE_FORMAT`). */
export const useItemsByDate = () => {
  const logState = useLogState();
  return useMemo(() => {
    const itemsByDate: Record<string, LogItem[]> = {};
    for (const item of logState.items) {
      const date = getItemDate(item);
      if (!itemsByDate[date]) {
        itemsByDate[date] = [];
      }
      itemsByDate[date].push(item);
    }
    return itemsByDate;
  }, [logState.items]);
};

/** Ids of entries that match the calendar filters, plus whether any filter is set. */
export const useFilteredItemIds = () => {
  const calendarFilters = useCalendarFilters();
  const { filteredItems, isFiltering } = calendarFilters.data;
  const ids = useMemo(
    () => new Set(filteredItems.map((item) => item.id)),
    // `data` keeps its reference while the filter content is unchanged.
    [filteredItems]
  );
  return { ids, isFiltering };
};
