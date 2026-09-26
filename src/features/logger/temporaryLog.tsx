import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
} from "react";
import type { LogItem } from "@/features/logs";
import { createMissingProviderError } from "@/lib/errors";

/**
 * Draft of an entry being created or edited. `rating` and sleep `quality`
 * are `null` until the user picks them.
 */
export type TemporaryLogState = Omit<LogItem, "rating" | "sleep"> & {
  rating: LogItem["rating"] | null;
  sleep: {
    quality: LogItem["sleep"]["quality"] | null;
  };
};

/**
 * Draft state shared by the logger slides.
 *
 * `data` is an empty object until `initialize` runs; check `isInitialized`
 * before reading it. `initialize` does not mark the draft dirty.
 */
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

const TemporaryLogProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDirty, setIsDirty] = useState(false);
  const [temporaryLog, setTemporaryLog] = useState<TemporaryLogState>(
    // SAFETY: empty placeholder until initialize(); isInitialized stays false while it is empty.
    {} as TemporaryLogState
  );
  const [isInitialized, setIsInitialized] = useState(false);

  const update = useCallback((next: Partial<TemporaryLogState>) => {
    setTemporaryLog((current) => {
      setIsDirty(true);
      return {
        ...current,
        ...next,
      };
    });
  }, []);

  const initialize = useCallback((log: TemporaryLogState) => {
    setTemporaryLog(log);
    setIsInitialized(true);
  }, []);

  const set = useCallback((log: TemporaryLogState) => {
    setTemporaryLog(log);
    setIsDirty(true);
  }, []);

  const reset = useCallback(() => {
    // SAFETY: empty placeholder until initialize(); isInitialized is reset to false below.
    setTemporaryLog({} as TemporaryLogState);
    setIsDirty(false);
    setIsInitialized(false);
  }, []);

  const value = useMemo(
    () => ({
      data: temporaryLog,
      initialize,
      set,
      update,
      reset,
      isDirty,
      isInitialized,
    }),
    [temporaryLog, initialize, set, update, reset, isDirty, isInitialized]
  );

  return (
    <TemporaryLogStateContext.Provider value={value}>
      {children}
    </TemporaryLogStateContext.Provider>
  );
};

const useTemporaryLog = (
  defaultValue?: TemporaryLogState
): TemporaryLogValue => {
  const context = useContext(TemporaryLogStateContext);

  if (context === undefined) {
    throw createMissingProviderError("useTemporaryLog", "TemporaryLogProvider");
  }

  // Effect event: initialize once on mount with the values of that render.
  const initializeDefaultValue = useEffectEvent(() => {
    if (defaultValue && !context.isInitialized) {
      context.initialize(defaultValue);
    }
  });

  useEffect(() => {
    initializeDefaultValue();
  }, []);

  const data = useMemo(
    () => (defaultValue ? { ...defaultValue, ...context.data } : context.data),
    [context.data, defaultValue]
  );

  return {
    ...context,
    data,
  };
};

export { TemporaryLogProvider, useTemporaryLog };
