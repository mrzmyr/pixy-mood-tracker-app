import difference from "lodash/difference";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useAnalytics } from "./useAnalytics";
import type { LogItem } from "./useLogs";
import { useLogState } from "./useLogs";
import { useContentStableValue } from "./useContentStableValue";
import type { Tag } from "./useTags";
import { createMissingProviderError } from "@/lib/errors";

interface FiltersData {
  text: string;
  ratings: LogItem["rating"][];
  tagIds: Tag["id"][];
}

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

const initialState: CalendarFiltersData = {
  text: "",
  ratings: [],
  tagIds: [],
  isFiltering: false,
  filterCount: 0,
  filteredItems: [],
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
  const [data, setData] = useState<CalendarFiltersData>(initialState);
  const [isOpen, setIsOpen] = useState(false);

  const set = useCallback(
    (filters: FiltersData) => {
      analytics.track("calendar_filters_filtered", {
        textLength: filters.text.length,
        ratings: filters.ratings,
        ratingsCount: filters.ratings.length,
        tagsCount: filters.tagIds.length,
      });

      const isFiltering =
        filters.text !== "" ||
        filters.ratings.length !== 0 ||
        filters.tagIds.length !== 0;

      const filterCount =
        (filters.text === "" ? 0 : 1) +
        filters.ratings.length +
        filters.tagIds.length;

      setData({
        ...filters,
        filteredItems: logState.items.filter((item) =>
          isMatchingFilters(item, filters)
        ),
        isFiltering,
        filterCount,
      });
    },
    [analytics, logState.items]
  );

  const reset = useCallback(() => {
    analytics.track("calendar_filters_reset");
    setData(initialState);
  }, [analytics]);

  const open = useCallback(() => {
    analytics.track("calendar_filters_opened");
    setIsOpen(true);
  }, [analytics]);

  const close = useCallback(() => {
    analytics.track("calendar_filters_closed");
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
