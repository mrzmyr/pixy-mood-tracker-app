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
import type { Person } from "@/features/people";
import { createMissingProviderError } from "@/lib/errors";
import { getItemDate } from "@/lib/logDates";

interface FiltersData {
  text: string;
  ratings: LogItem["rating"][];
  tagIds: Tag["id"][];
  personIds: Person["id"][];
}

/**
 * Active calendar filters and their result.
 *
 * `filteredItems` follows the current logs, so new and edited entries match
 * while filters stay active. Selected tags must all be present on an entry
 * for it to match; one selected person is enough.
 */
export interface CalendarFiltersData extends FiltersData {
  filteredItems: LogItem[];
  /** Local days (`getItemDate`) with at least one entry in `filteredItems`. */
  filteredDates: ReadonlySet<string>;
  filterCount: number;
  isFiltering: boolean;
}

interface Value {
  data: CalendarFiltersData;
  set: (data: FiltersData) => void;
  reset: () => void;
}

/** Filter sheet visibility. Apart from `Value`: toggling the sheet must not re-render calendar cells. */
interface SheetValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const CalendarFiltersStateContext = createContext<Value | undefined>(undefined);
const CalendarFiltersSheetContext = createContext<SheetValue | undefined>(
  undefined
);

const NO_ITEMS: LogItem[] = [];

const initialFilters: FiltersData = {
  text: "",
  ratings: [],
  tagIds: [],
  personIds: [],
};

const isMatchingFilters = (item: LogItem, filters: FiltersData) => {
  const matchesText = item.message
    .toLowerCase()
    .includes(filters.text.toLowerCase());
  const matchesRatings = filters.ratings.includes(item.rating);
  const tagIds = item?.tags?.map((tag) => tag.id);
  const matchesTags = difference(filters.tagIds, tagIds).length === 0;
  const personIds = new Set(item.people.map((person) => person.id));
  const matchesPeople = filters.personIds.some((id) => personIds.has(id));

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
  if (filters.personIds.length !== 0) {
    conditions.push(matchesPeople);
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
        people_count: next.personIds.length,
      });
      // Callers spread `data` into `next`; keep only the filter fields.
      setFilters({
        text: next.text,
        ratings: next.ratings,
        tagIds: next.tagIds,
        personIds: next.personIds,
      });
    },
    [analytics]
  );

  // Compare the small filter input by content, never the matched entries:
  // serializing every filtered entry on each render was the hot path.
  const stableFilters = useContentStableValue(filters);
  const isFiltering =
    stableFilters.text !== "" ||
    stableFilters.ratings.length !== 0 ||
    stableFilters.tagIds.length !== 0 ||
    stableFilters.personIds.length !== 0;
  // Without filters, log changes leave `data` untouched.
  const matchSource = isFiltering ? logState.items : NO_ITEMS;

  const data: CalendarFiltersData = useMemo(() => {
    const filterCount =
      (stableFilters.text === "" ? 0 : 1) +
      stableFilters.ratings.length +
      stableFilters.tagIds.length +
      stableFilters.personIds.length;
    const filteredItems = matchSource.filter((item) =>
      isMatchingFilters(item, stableFilters)
    );
    return {
      ...stableFilters,
      isFiltering,
      filterCount,
      filteredItems,
      filteredDates: new Set(filteredItems.map(getItemDate)),
    };
  }, [stableFilters, isFiltering, matchSource]);

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

  const value: Value = useMemo(
    () => ({ data, set, reset }),
    [data, set, reset]
  );

  const sheetValue: SheetValue = useMemo(
    () => ({ isOpen, open, close }),
    [isOpen, open, close]
  );

  return (
    <CalendarFiltersStateContext.Provider value={value}>
      <CalendarFiltersSheetContext.Provider value={sheetValue}>
        {children}
      </CalendarFiltersSheetContext.Provider>
    </CalendarFiltersStateContext.Provider>
  );
};

/** Active filters and their result, plus `set` and `reset`. */
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

/** Filter sheet visibility. Closing keeps the filters. */
const useCalendarFiltersSheet = (): SheetValue => {
  const context = useContext(CalendarFiltersSheetContext);
  if (context === undefined) {
    throw createMissingProviderError(
      "useCalendarFiltersSheet",
      "CalendarFiltersProvider"
    );
  }
  return context;
};

export { CalendarFiltersProvider, useCalendarFilters, useCalendarFiltersSheet };
