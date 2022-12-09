import { createContext, useContext, useEffect, useState } from "react";
import { LogItem } from "./useLogs";

type State = Omit<LogItem, 'rating'> & {
  rating: LogItem['rating'] | null
}

interface Value {
  data: State;
  isDirty: boolean;
  initialize: (log: State) => void;
  set: (log: State) => void;
  update: (log: Partial<State>) => void;
  reset: () => void;
};

interface ContextValue extends Value {
}

const TemporaryLogStateContext = createContext({} as Value);

function TemporaryLogProvider({ children }: { children: React.ReactNode }) {
  const [isDirty, setIsDirty] = useState(false);
  const [temporaryLog, setTemporaryLog] = useState<State>({} as State);

  const update = (next: Partial<State>) => {
    setTemporaryLog((current) => {
      setIsDirty(true);
      return {
        ...current,
        ...next
      };
    });
  };

  const initialize = (log: State) => {
    setTemporaryLog(log);
  };

  const set = (log: State) => {
    setTemporaryLog(log);
    setIsDirty(true);
  };

  const reset = () => {
    setTemporaryLog({} as State);
    setIsDirty(false);
  };

  return (
    <TemporaryLogStateContext.Provider value={{
      data: temporaryLog,
      initialize,
      set,
      update,
      reset,
      isDirty,
    }}>
      {children}
    </TemporaryLogStateContext.Provider>
  );
}

function useTemporaryLog(defaultValue?: State): ContextValue {
  const context = useContext(TemporaryLogStateContext);

  if (context === undefined) {
    throw new Error(
      "useTemporaryLog must be used within a TemporaryLogProvider"
    );
  }

  useEffect(() => {
    if (defaultValue) {
      context.initialize(defaultValue);
    }
  }, [defaultValue]);

  const data = defaultValue ? { ...defaultValue, ...context.data } : context.data;

  return {
    ...context,
    data,
  };
}

export { TemporaryLogProvider, useTemporaryLog };
