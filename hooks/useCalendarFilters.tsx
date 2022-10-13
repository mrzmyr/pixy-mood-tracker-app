import _ from "lodash";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useAnalytics } from "./useAnalytics";
import { LogItem, useLogState } from './useLogs';
import { Tag } from "./useTags";

const CalendarFiltersStateContext = createContext(undefined)

export type CalendarFiltersData = {
  text: string,
  ratings: LogItem['rating'][],
  tagIds: Tag['id'][],
  isOpen: boolean,
  filteredItems: LogItem[];
  filterCount: number;
  isFiltering: boolean;
}

type Value = {
  data: CalendarFiltersData;
  set: (data: CalendarFiltersData) => void;
  reset: () => void;
  open: () => void;
  close: () => void;
  isOpen: boolean;
}

const initialState: CalendarFiltersData = {
  text: '',
  ratings: [],
  tagIds: [],
  isOpen: false,
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

    const conditions = []

    if(data.text !== '') conditions.push(matchesText)
    if(data.ratings.length !== 0) conditions.push(matchesRatings)
    if(data.tagIds.length !== 0) conditions.push(matchesTags)

    return conditions.every(condition => condition)
  }
  
  const _getFilteredItems = (data): LogItem[] => {
    return Object.values(logState.items).filter((item) => !_isMatching(item, data))
  }
  
  const _setData = (data: CalendarFiltersData) => {
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
  }
  
  const set = useCallback((data: CalendarFiltersData) => {
    analytics.track('calendar_filters_filtered', {
      textLength: data.text.length,
      ratings: data.ratings,
      ratingsCount: data.ratings.length,
      tagsCount: data.tagIds.length,
    })
    _setData(data)
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
