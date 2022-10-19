import { createContext, useContext, useState } from "react";
import { LogItem } from "./useLogs";

const TemporaryLogStateContext = createContext(undefined);

type State = Omit<LogItem, 'rating' | 'date'> & {
  rating: LogItem['rating'] | null
  date: LogItem['date'] | null
}

type Value = {
  data: State;
  set: (log: State | ((log: State) => void)) => void;
  reset: () => void;
  hasChanged: () => boolean;
  hasDifference: (log: LogItem) => boolean;
};

const initialState: State = {
  message: "",
  rating: null,
  tags: [],
  date: null,
};

function TemporaryLogProvider({ children }: { children: React.ReactNode }) {
  const [temporaryLog, setTemporaryLog] = useState<State>(initialState);

  const value: Value = {
    data: temporaryLog,
    set: setTemporaryLog,
    reset: () => setTemporaryLog(initialState),
    hasChanged: () => {
      return (
        temporaryLog.message.length > 0 || 
        temporaryLog?.tags?.length > 0 ||
        temporaryLog.rating !== null
      )
    },
    hasDifference: (log: LogItem) => {
      return (
        temporaryLog.message.length !== log?.message.length || 
        temporaryLog?.tags?.length !== log?.tags?.length ||
        temporaryLog.rating !== log?.rating
      )
    }
  };

  return (
    <TemporaryLogStateContext.Provider value={value}>
      {children}
    </TemporaryLogStateContext.Provider>
  );
}

function useTemporaryLog(): Value {
  const context = useContext(TemporaryLogStateContext);
  if (context === undefined) {
    throw new Error(
      "useTemporaryLog must be used within a TemporaryLogProvider"
    );
  }
  return context;
}

export { TemporaryLogProvider, useTemporaryLog };
