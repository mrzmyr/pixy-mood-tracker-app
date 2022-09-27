import dayjs from "dayjs";
import { createContext, useContext, useState } from "react";
import { LogItem } from './useLogs';

const TemporaryLogStateContext = createContext(undefined)

type Value = {
  data: LogItem;
  set: (log: LogItem) => void;
  reset: () => void;
}

const initialState: LogItem = {
  date: dayjs().format('YYYY-MM-DD'),
  rating: null,
  message: '',
  tags: [],
}

function TemporaryLogProvider({
  children
}: { 
  children: React.ReactNode 
}) {
  const [temporaryLog, setTemporaryLog] = useState<LogItem>(initialState)

  const value: Value = { 
    data: temporaryLog, 
    set: setTemporaryLog,
    reset: () => setTemporaryLog(initialState)
  };
  
  return (
    <TemporaryLogStateContext.Provider value={value}>
      {children}
    </TemporaryLogStateContext.Provider>
  )
}

function useTemporaryLog(): Value {
  const context = useContext(TemporaryLogStateContext)
  if (context === undefined) {
    throw new Error('useTemporaryLog must be used within a TemporaryLogProvider')
  }
  return context
}

export { TemporaryLogProvider, useTemporaryLog };
