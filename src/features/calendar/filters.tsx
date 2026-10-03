import difference from "lodash/difference";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useAnalytics } from "@/state/analytics";
import { useLogState } from "@/features/logs";
import type { LogItem } from "@/features/logs";

import { useContentStableValue } from "@/hooks/useContentStableValue";
import type { Tag } from "@/features/tags";
import { createMissingProviderError } from "@/lib/errors";

interface FiltersData {
  text: string;
  ratings: LogItem["rating"][];
  tagIds: Tag["id"][];
}

/**
 * Active calendar filters and their result.
 *
 * `filteredItems` follows the current logs, so new and edited entries match
 * while filters stay active. Selected tags must all be present on an entry
 * for it to match.
 */
export interface CalendarFiltersData extends FiltersData {
  filteredItems: LogItem[];
  filterCount: number;
  isFiltering: boolean;
}

interface Value {
  data: CalendarFiltersData;
  set: (data: FiltersData) => void;
  reset: () => void;
  open: () => void;
  close: () => void;
  isOpen: boolean;
}

// SAFETY: every consumer renders inside CalendarFiltersProvider, which supplies the full Value.
const CalendarFiltersStateContext = createContext({} as Value);

const initialFilters: FiltersData = {
  text: "",
  ratings: [],
  tagIds: [],
};

const isMatchingFilters = (item: LogItem, filters: FiltersData) => {
  const matchesText = item.message
    .toLowerCase()
    .includes(filters.text.toLowerCase());
  const matchesRatings = filters.ratings.includes(item.rating);
  const tagIds = item?.tags?.map((tag) => tag.id);
  const matchesTags = difference(filters.tagIds, tagIds).length === 0;

  const conditions: boolean[] = [];

  if (filters.text !== "") {
    conditions.push(matchesText);
  }
  if (filters.ratings.length !== 0) {
    conditions.push(matchesRatings);
  }
  if (filters.tagIds.length !== 0) {
    conditions.push(matchesTags);
  }

  return conditions.every(Boolean);
};

const CalendarFiltersProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const analytics = useAnalytics();
  const logState = useLogState();
  const [filters, setFilters] = useState<FiltersData>(initialFilters);
  const [isOpen, setIsOpen] = useState(false);

  const set = useCallback(
    (next: FiltersData) => {
      analytics.track("calendar:filters_applied", {
        text_length: next.text.length,
        ratings_count: next.ratings.length,
        tags_count: next.tagIds.length,
      });
      // Callers spread `data` into `next`; keep only the filter fields.
      setFilters({
        text: next.text,
        ratings: next.ratings,
        tagIds: next.tagIds,
      });
    },
    [analytics]
  );

  const data: CalendarFiltersData = useMemo(() => {
    const isFiltering =
      filters.text !== "" ||
      filters.ratings.length !== 0 ||
      filters.tagIds.length !== 0;
    const filterCount =
      (filters.text === "" ? 0 : 1) +
      filters.ratings.length +
      filters.tagIds.length;
    return {
      ...filters,
      isFiltering,
      filterCount,
      filteredItems: isFiltering
        ? logState.items.filter((item) => isMatchingFilters(item, filters))
        : [],
    };
  }, [filters, logState.items]);

  const reset = useCallback(() => {
    analytics.track("calendar:filters_reset");
    setFilters(initialFilters);
  }, [analytics]);

  const open = useCallback(() => {
    analytics.track("calendar:filters_opened");
    setIsOpen(true);
  }, [analytics]);

  // Closing keeps the filters: the calendar stays filtered and the header
  // badge shows the count. The sheet's Reset button clears them.
  const close = useCallback(() => {
    analytics.track("calendar:filters_closed");
    setIsOpen(false);
  }, [analytics]);

  // Keep the context value stable when filters are set to equal data.
  const stableData = useContentStableValue(data);

  const value: Value = useMemo(
    () => ({
      data: stableData,
      set,
      reset,
      open,
      close,
      isOpen,
    }),
    [stableData, set, reset, open, close, isOpen]
  );

  return (
    <CalendarFiltersStateContext.Provider value={value}>
      {children}
    </CalendarFiltersStateContext.Provider>
  );
};

const useCalendarFilters = (): Value => {
  const context = useContext(CalendarFiltersStateContext);
  if (context === undefined) {
    throw createMissingProviderError(
      "useCalendarFilters",
      "CalendarFiltersProvider"
    );
  }
  return context;
};

export { CalendarFiltersProvider, useCalendarFilters };
