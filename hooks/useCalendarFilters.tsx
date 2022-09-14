import dayjs from "dayjs";
import _ from "lodash";
import { createContext, useContext, useState } from "react";
import { LogItem } from './useLogs';
import { Tag } from "./useSettings";

const CalendarFiltersStateContext = createContext(undefined)

type CalendarFiltersData = {
  text: string,
  ratings: LogItem['rating'][],
  tagIds: Tag['id'][],
  isOpen: boolean,
  isFiltering: boolean,
  filterCount: number,
}

type Value = {
  data: CalendarFiltersData;
  set: (data: CalendarFiltersData) => void;
  reset: () => void;
  open: () => void;
  close: () => void;
  validate: (log: LogItem) => boolean;
  isOpen: boolean;
  isFiltering: boolean;
  filterCount: number;
}

const initialState: CalendarFiltersData = {
  text: '',
  ratings: [],
  tagIds: [],
  isOpen: false,
  isFiltering: false,
  filterCount: 0,
}

function CalendarFiltersProvider({
  children
}: { 
  children: React.ReactNode 
}) {
  const [data, setData] = useState<CalendarFiltersData>(initialState)

  const _setData = (data: CalendarFiltersData) => {
    const isFiltering = (
      data.text !== '' ||
      data.ratings.length !== 0 ||
      data.tagIds.length !== 0
    );
    
    setData({
      ...data,
      isFiltering,
      filterCount: (data.text !== '' ? 1 : 0) + data.ratings.length + data.tagIds.length,
    })
  }
  
  const value: Value = {
    data, 
    set: _setData,
    reset: () => setData(initialState),
    open: () => setData({ ...data, isOpen: true }),
    close: () => setData({ ...data, isOpen: false }),
    validate: (log: LogItem) => {
      const matchesText = log.message.toLowerCase().includes(data.text.toLowerCase())
      const matchesRatings = data.ratings.includes(log.rating)
      const tagIds = log?.tags?.map(tag => tag.id)
      const matchesTags = _.difference(data.tagIds, tagIds).length === 0;

      const conditions = []

      if(data.text !== '') conditions.push(matchesText)
      if(data.ratings.length !== 0) conditions.push(matchesRatings)
      if(data.tagIds.length !== 0) conditions.push(matchesTags)

      return conditions.every(condition => condition)
    },
    isFiltering: data.isFiltering,
    filterCount: data.filterCount,
    isOpen: data.isOpen,
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
