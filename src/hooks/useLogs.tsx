import { DATE_FORMAT } from "@/constants/Config";
import { load, store } from "@/helpers/storage";
import type { LogItemSchema } from "@/types";
// oxlint-disable-next-line unicorn/prefer-node-protocol -- `buffer` is the npm polyfill bundled for React Native; `node:buffer` does not resolve in Hermes.
import dayjs from "dayjs";
import isArray from "lodash/isArray";
import omit from "lodash/omit";
import pick from "lodash/pick";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useMemo,
  useReducer,
  useState,
} from "react";
import { logger, toStructuredError } from "@/lib/logger";
import { v4 as uuidv4 } from "uuid";
import type z from "zod";
import type { AtLeast } from "../../types";
import type { RATING_KEYS } from "@/constants/Ratings";
import { useAnalytics } from "./useAnalytics";
import { useContentStableValue } from "./useContentStableValue";
import { createMissingProviderError } from "@/lib/errors";

/**
 * AsyncStorage key for logs. Keep the legacy name; changing it orphans all
 * stored entries.
 */
export const STORAGE_KEY = "PIXEL_TRACKER_LOGS";

/** A single mood entry as stored and exported. */
export type LogItem = z.infer<typeof LogItemSchema>;

/**
 * Entries grouped into one local calendar day with day averages.
 *
 * `date` uses `DATE_FORMAT`; `ratingAvg` is the rounded mean rating.
 */
export interface LogDay {
  date: string;
  items: LogItem[];
  ratingAvg: (typeof RATING_KEYS)[number];
  sleepQualityAvg: number | null;
}

/**
 * Logs store state. `loaded` stays `false` until storage is read; nothing
 * is persisted before that.
 */
export interface LogsState {
  loaded?: boolean;
  items: LogItem[];
}

type LogAction =
  | { type: "import"; payload: LogsState }
  | { type: "add"; payload: LogItem }
  | { type: "edit"; payload: AtLeast<LogItem, "id"> }
  | { type: "batchEdit"; payload: LogItem[] }
  | { type: "delete"; payload: LogItem["id"] }
  | { type: "removeTag"; payload: string }
  | { type: "reset"; payload: LogsState };

/**
 * Mutations for the logs store from `useLogUpdater`.
 *
 * `editLog` shallow-merges into the entry with the same `id` and ignores
 * unknown ids. `updateLogs` replaces all entries. `import` also migrates
 * legacy data (keyed items, missing ids, tags, or emotions).
 */
export interface UpdaterValue {
  addLog: (item: LogItem) => void;
  editLog: (item: AtLeast<LogItem, "id">) => void;
  updateLogs: (items: LogsState["items"]) => void;
  deleteLog: (id: LogItem["id"]) => void;
  removeTagFromLogs: (tagId: string) => void;
  reset: () => void;
  import: (data: LogsState) => void;
}

type StateValue = LogsState;

// SAFETY: every consumer renders inside LogsProvider, which supplies the value; the default is never read.
const LogStateContext = createContext<StateValue>(undefined as never);
// SAFETY: every consumer renders inside LogsProvider, which supplies the value; the default is never read.
const LogUpdaterContext = createContext<UpdaterValue>(undefined as never);

const migrate = (data: LogsState): LogsState => {
  const result = {
    ...data,
  };

  if (!isArray(data.items)) {
    result.items = Object.values(result.items);
  }

  result.items = result.items.map((item) => {
    const date = dayjs(item.date).format(DATE_FORMAT);

    const newItem = { ...item };

    if (!newItem.createdAt) {
      newItem.createdAt = dayjs(date).toISOString();
    }
    if (!newItem.dateTime) {
      newItem.dateTime = dayjs(date).toISOString();
    }
    if (!newItem.id) {
      newItem.id = uuidv4();
    }
    if (!newItem.tags) {
      newItem.tags = [];
    }
    if (!newItem.emotions) {
      newItem.emotions = [];
    }

    newItem.tags = newItem.tags.map((tag) => pick(tag, ["id"]));

    return newItem;
  });

  return result;
};

const reducer = (state: LogsState, action: LogAction): LogsState => {
  switch (action.type) {
    case "import": {
      return migrate({
        ...action.payload,
        loaded: true,
      });
    }
    case "add": {
      return {
        ...state,
        items: [...state.items, action.payload],
      };
    }
    case "edit": {
      return {
        ...state,
        items: state.items.map((item) => {
          if (item.id === action.payload.id) {
            return {
              ...item,
              ...action.payload,
            };
          }
          return item;
        }),
      };
    }
    case "batchEdit": {
      return {
        ...state,
        items: action.payload,
      };
    }
    case "delete": {
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.payload),
      };
    }
    // Runs against the reducer's current state, not a caller's snapshot, so
    // logs added in the same tick are kept.
    case "removeTag": {
      return {
        ...state,
        items: state.items.map((item) =>
          item.tags.some((tag) => tag.id === action.payload)
            ? {
                ...item,
                tags: item.tags.filter((tag) => tag.id !== action.payload),
              }
            : item
        ),
      };
    }
    case "reset": {
      return {
        ...action.payload,
        loaded: true,
      };
    }
    default: {
      return state;
    }
  }
};

const INITIAL_STATE: LogsState = {
  loaded: false,
  items: [],
};

const LogsProvider = ({ children }: { children: React.ReactNode }) => {
  const analyitcs = useAnalytics();

  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const [storageStatus, setStorageStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  // Reducer updates can produce equal copies (e.g. saving an unchanged log);
  // only content changes should persist or notify consumers.
  const stableState = useContentStableValue(state);

  // Effect event: the load effect runs once on mount but tracks with the
  // latest analytics instance.
  const trackLoadedLogs = useEffectEvent((megaBytes: number) => {
    analyitcs.track("loaded_logs", { size: megaBytes, unit: "mb" });
  });

  useEffect(() => {
    (async () => {
      try {
        const value = await load<LogsState>(STORAGE_KEY);
        if (value === null) {
          dispatch({
            type: "import",
            payload: {
              ...INITIAL_STATE,
            },
          });
        } else {
          dispatch({
            type: "import",
            payload: value,
          });
        }
        setStorageStatus("ready");

        try {
          const size = new TextEncoder().encode(JSON.stringify(value)).length;
          const megaBytes = Math.round((size / 1024 / 1024) * 100) / 100;
          trackLoadedLogs(megaBytes);
        } catch (error) {
          logger.error(
            toStructuredError(error, {
              status: "logs_size_tracking_failed",
              message: "Stored logs size could not be tracked",
              fix: "None needed; tracking runs again on the next launch",
            })
          );
        }
      } catch (error) {
        setStorageStatus("error");
        logger.error(
          toStructuredError(error, {
            status: "logs_load_failed",
            message: "Stored logs could not be loaded",
            fix: "Restart the app; stored data is kept and not overwritten",
          })
        );
      }
    })();
  }, []);

  useEffect(() => {
    if (storageStatus === "ready" && stableState.loaded) {
      store<Omit<LogsState, "loaded">>(
        STORAGE_KEY,
        omit(stableState, "loaded")
      );
    }
  }, [stableState, storageStatus]);

  const importState = useCallback((data: LogsState) => {
    dispatch({
      type: "import",
      payload: data,
    });
  }, []);

  const addLog = useCallback(
    (payload: LogItem) => dispatch({ type: "add", payload }),
    []
  );
  const editLog = useCallback(
    (payload: AtLeast<LogItem, "id">) => dispatch({ type: "edit", payload }),
    []
  );
  const updateLogs = useCallback(
    (items: LogsState["items"]) =>
      dispatch({ type: "batchEdit", payload: items }),
    []
  );
  const deleteLog = useCallback(
    (payload: LogItem["id"]) => dispatch({ type: "delete", payload }),
    []
  );
  const removeTagFromLogs = useCallback(
    (tagId: string) => dispatch({ type: "removeTag", payload: tagId }),
    []
  );
  const reset = useCallback(
    () => dispatch({ type: "reset", payload: INITIAL_STATE }),
    []
  );

  const updaterValue: UpdaterValue = useMemo(
    () => ({
      addLog,
      editLog,
      updateLogs,
      deleteLog,
      removeTagFromLogs,
      reset,
      import: importState,
    }),
    [
      addLog,
      editLog,
      updateLogs,
      deleteLog,
      removeTagFromLogs,
      reset,
      importState,
    ]
  );

  const stateValue: StateValue = useMemo(
    () => ({
      ...stableState,
    }),
    [stableState]
  );

  return (
    <LogStateContext.Provider value={stateValue}>
      <LogUpdaterContext.Provider value={updaterValue}>
        {children}
      </LogUpdaterContext.Provider>
    </LogStateContext.Provider>
  );
};

const useLogState = (): StateValue => {
  const context = useContext(LogStateContext);
  if (context === undefined) {
    throw createMissingProviderError("useLogState", "LogsProvider");
  }
  return context;
};

const useLogUpdater = (): UpdaterValue => {
  const context = useContext(LogUpdaterContext);
  if (context === undefined) {
    throw createMissingProviderError("useLogUpdater", "LogsProvider");
  }
  return context;
};

export { LogsProvider, useLogState, useLogUpdater };
