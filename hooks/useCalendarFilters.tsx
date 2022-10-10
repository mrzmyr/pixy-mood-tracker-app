import _ from "lodash";
import { createContext, useContext, useState } from "react";
import { useAnalytics } from "./useAnalytics";
import { LogItem, useLogs } from './useLogs';
import { Tag } from "./useSettings";

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
  filterCount: number;
  isFiltering: boolean;
  filteredItems: LogItem[];
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
  const logs = useLogs();
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
    return Object.entries(logs.state.items)
      .filter(([_, item]) => !_isMatching(item, data))
      .map(([_, item]) => item)
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
  
  const value: Value = {
    data, 
    set: data => {
      analytics.track('calendar_filter_filtered', {
        textLength: data.text.length,
        ratings: data.ratings,
        tagIds: data.tagIds,
      })
      _setData(data)
    },
    reset: () => {
      analytics.track('calendar_filters_reset')
      setData(initialState)
    },
    open: () => {
      analytics.track('calendar_filters_opened')
      setIsOpen(true)
    },
    close: () => {
      analytics.track('calendar_filters_closed')
      setIsOpen(false)
    },
    filteredItems: data.filteredItems,
    isFiltering: data.isFiltering,
    filterCount: data.filterCount,
    isOpen,
  };
  
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
