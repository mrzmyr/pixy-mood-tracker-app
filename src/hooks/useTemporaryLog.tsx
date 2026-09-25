import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { LogItem } from "./useLogs";

export type TemporaryLogState = Omit<LogItem, "rating" | "sleep"> & {
  rating: LogItem["rating"] | null;
  sleep: {
    quality: LogItem["sleep"]["quality"] | null;
  };
};

export interface TemporaryLogValue {
  data: TemporaryLogState;
  isDirty: boolean;
  isInitialized: boolean;
  initialize: (log: TemporaryLogState) => void;
  set: (log: TemporaryLogState) => void;
  update: (log: Partial<TemporaryLogState>) => void;
  reset: () => void;
}

// SAFETY: every consumer renders inside TemporaryLogProvider, which supplies the full value.
const TemporaryLogStateContext = createContext({} as TemporaryLogValue);

function TemporaryLogProvider({ children }: { children: React.ReactNode }) {
  const [isDirty, setIsDirty] = useState(false);
  const [temporaryLog, setTemporaryLog] = useState<TemporaryLogState>(
    // SAFETY: empty placeholder until initialize(); isInitialized stays false while it is empty.
    {} as TemporaryLogState
  );
  const [isInitialized, setIsInitialized] = useState(false);

  const update = (next: Partial<TemporaryLogState>) => {
    setTemporaryLog((current) => {
      setIsDirty(true);
      return {
        ...current,
        ...next,
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
    // SAFETY: empty placeholder until initialize(); isInitialized is reset to false below.
    setTemporaryLog({} as TemporaryLogState);
    setIsDirty(false);
    setIsInitialized(false);
  };

  const value = useMemo(
    () => ({
      data: temporaryLog,
      initialize,
      set,
      update,
      reset,
      isDirty,
    }),
    [temporaryLog, isDirty]
  );

  return (
    <TemporaryLogStateContext.Provider
      value={{
        data: temporaryLog,
        initialize,
        set,
        update,
        reset,
        isDirty,
        isInitialized,
      }}
    >
      {children}
    </TemporaryLogStateContext.Provider>
  );
}

function useTemporaryLog(defaultValue?: TemporaryLogState): TemporaryLogValue {
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
  }, []);

  const data = useMemo(
    () => (defaultValue ? { ...defaultValue, ...context.data } : context.data),
    [context.data, defaultValue]
  );

  return {
    ...context,
    data,
  };
}

export { TemporaryLogProvider, useTemporaryLog };
