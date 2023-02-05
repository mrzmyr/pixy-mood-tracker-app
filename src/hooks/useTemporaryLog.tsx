import { createContext, useContext, useEffect, useState } from "react";
import { LogItem } from "./useLogs";

export type TemporaryLogState = Omit<LogItem, 'rating' | 'sleep'> & {
  rating: LogItem['rating'] | null,
  sleep: {
    quality: LogItem['sleep']['quality'] | null,
  }
}

interface Value {
  data: TemporaryLogState;
  isDirty: boolean;
  isInitialized: boolean;
  initialize: (log: TemporaryLogState) => void;
  set: (log: TemporaryLogState) => void;
  update: (log: Partial<TemporaryLogState>) => void;
  reset: () => void;
};

interface ContextValue extends Value {
}

const TemporaryLogStateContext = createContext({} as Value);

function TemporaryLogProvider({ children }: { children: React.ReactNode }) {
  const [isDirty, setIsDirty] = useState(false);
  const [temporaryLog, setTemporaryLog] = useState<TemporaryLogState>({} as TemporaryLogState);
  const [isInitialized, setIsInitialized] = useState(false);

  const update = (next: Partial<TemporaryLogState>) => {
    setTemporaryLog((current) => {
      setIsDirty(true);
      return {
        ...current,
        ...next
      };
    });
  };

  const initialize = (log: TemporaryLogState) => {
    setTemporaryLog(log);
    setIsInitialized(true);
  };

  const set = (log: TemporaryLogState) => {
    setTemporaryLog(log);
    setIsDirty(true);
  };

  const reset = () => {
    setTemporaryLog({} as TemporaryLogState);
    setIsDirty(false);
    setIsInitialized(false);
  };

  return (
    <TemporaryLogStateContext.Provider value={{
      data: temporaryLog,
      initialize,
      set,
      update,
      reset,
      isDirty,
      isInitialized,
    }}>
      {children}
    </TemporaryLogStateContext.Provider>
  );
}

function useTemporaryLog(defaultValue?: TemporaryLogState): ContextValue {
  const context = useContext(TemporaryLogStateContext);

  if (context === undefined) {
    throw new Error(
      "useTemporaryLog must be used within a TemporaryLogProvider"
    );
  }

  useEffect(() => {
    if (defaultValue && !context.isInitialized) {
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
