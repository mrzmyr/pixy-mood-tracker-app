import _ from "lodash";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useAnalytics } from "./useAnalytics";
import { LogItem, useLogState } from './useLogs';
import { Tag } from "./useTags";


interface FiltersData {
  text: string,
  ratings: LogItem['rating'][],
  tagIds: Tag['id'][],
}

export interface CalendarFiltersData extends FiltersData {
  filteredItems: LogItem[];
  filterCount: number;
  isFiltering: boolean;
}

type Value = {
  data: CalendarFiltersData;
  set: (data: FiltersData) => void;
  reset: () => void;
  open: () => void;
  close: () => void;
  isOpen: boolean;
}

const CalendarFiltersStateContext = createContext({} as Value)

const initialState: CalendarFiltersData = {
  text: '',
  ratings: [],
  tagIds: [],
  isFiltering: false,
  filterCount: 0,
  filteredItems: [],
}

function CalendarFiltersProvider({
  children
}: {
  children: React.ReactNode
}) {
  const analytics = useAnalytics()
  const logState = useLogState()
  const [data, setData] = useState<CalendarFiltersData>(initialState)
  const [isOpen, setIsOpen] = useState(false)

  const _isMatching = (item: LogItem, data: CalendarFiltersData) => {
    const matchesText = item.message.toLowerCase().includes(data.text.toLowerCase())
    const matchesRatings = data.ratings.includes(item.rating)
    const tagIds = item?.tags?.map(tag => tag.id)
    const matchesTags = _.difference(data.tagIds, tagIds).length === 0;

    const conditions: boolean[] = []

    if (data.text !== '') conditions.push(matchesText)
    if (data.ratings.length !== 0) conditions.push(matchesRatings)
    if (data.tagIds.length !== 0) conditions.push(matchesTags)

    return conditions.every(condition => condition)
  }

  const _getFilteredItems = (data): LogItem[] => {
    return logState.items.filter((item) => _isMatching(item, data))
  }

  const set = useCallback((data: FiltersData) => {
    analytics.track('calendar_filters_filtered', {
      textLength: data.text.length,
      ratings: data.ratings,
      ratingsCount: data.ratings.length,
      tagsCount: data.tagIds.length,
    })

    const isFiltering = (
      data.text !== '' ||
      data.ratings.length !== 0 ||
      data.tagIds.length !== 0
    );

    const filterCount = (data.text !== '' ? 1 : 0) + data.ratings.length + data.tagIds.length;

    setData({
      ...data,
      filteredItems: _getFilteredItems(data),
      isFiltering,
      filterCount,
    })
  }, [analytics])

  const reset = useCallback(() => {
    analytics.track('calendar_filters_reset')
    setData(initialState)
  }, [])

  const open = useCallback(() => {
    analytics.track('calendar_filters_opened')
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    analytics.track('calendar_filters_closed')
    setIsOpen(false)
  }, [])

  const value: Value = useMemo(() => ({
    data,
    set,
    reset,
    open,
    close,
    isOpen,
  }), [JSON.stringify(data), set, reset, open, close, isOpen])

  return (
    <CalendarFiltersStateContext.Provider value={value}>
      {children}
    </CalendarFiltersStateContext.Provider>
  )
}

function useCalendarFilters(): Value {
  const context = useContext(CalendarFiltersStateContext)
  if (context === undefined) {
    throw new Error('useCalendarFilters must be used within a CalendarFiltersProvider')
  }
  return context
}

export { CalendarFiltersProvider, useCalendarFilters };
