import { DATE_FORMAT } from "@/constants/Config";
import { t } from "@/helpers/translation";
import { load, store } from "@/state/persisted";
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
  useRef,
  useState,
} from "react";
import { Alert } from "react-native";
import * as Sentry from "@sentry/react-native";
import { v4 as uuidv4 } from "uuid";
import type z from "zod";
import type { AtLeast } from "../../../types";
import type { RATING_KEYS } from "@/constants/Ratings";
import { useAnalytics } from "@/state/analytics";
import { useContentStableValue } from "@/hooks/useContentStableValue";
import {
  createMissingProviderError,
  createStructuredError,
} from "@/lib/errors";

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
 * Each updater saves first and publishes the new state only after the write
 * succeeds. It resolves `true` when saved. On failure it alerts the user,
 * keeps the state unchanged, and resolves `false`; callers must stop there.
 *
 * `editLog` shallow-merges into the entry with the same `id` and ignores
 * unknown ids. `updateLogs` replaces all entries. `import` also migrates
 * legacy data (keyed items, missing ids, tags, or emotions).
 */
export interface UpdaterValue {
  addLog: (item: LogItem) => Promise<boolean>;
  editLog: (item: AtLeast<LogItem, "id">) => Promise<boolean>;
  updateLogs: (items: LogsState["items"]) => Promise<boolean>;
  deleteLog: (id: LogItem["id"]) => Promise<boolean>;
  removeTagFromLogs: (tagId: string) => Promise<boolean>;
  reset: () => Promise<boolean>;
  import: (data: LogsState) => Promise<boolean>;
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
    // Runs against the last saved state, not a caller's snapshot, so logs
    // added in the same tick are kept.
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

const createLogsNotLoadedError = () =>
  createStructuredError({
    status: "logs_not_loaded",
    message: "Logs could not be saved",
    why: "Stored logs are still loading or could not be read",
    fix: "Restart the app and try again",
  });

const LogsProvider = ({ children }: { children: React.ReactNode }) => {
  const analyitcs = useAnalytics();

  const [state, setState] = useState(INITIAL_STATE);
  // Last saved state. Queued writes build on it, not on a render snapshot.
  const savedState = useRef(INITIAL_STATE);
  // Last queued write. The next write waits for it, even when it failed.
  const writeQueue = useRef<Promise<boolean> | null>(null);
  // Equal copies (e.g. saving an unchanged log) keep the previous reference,
  // so consumers only re-render on content changes.
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
        // A read error throws above and keeps `loaded: false`, so no write
        // can replace the stored logs.
        savedState.current = reducer(INITIAL_STATE, {
          type: "import",
          payload: value ?? INITIAL_STATE,
        });
        setState(savedState.current);

        try {
          const size = new TextEncoder().encode(JSON.stringify(value)).length;
          const megaBytes = Math.round((size / 1024 / 1024) * 100) / 100;
          trackLoadedLogs(megaBytes);
        } catch (error) {
          Sentry.captureException(error);
        }
      } catch (error) {
        Sentry.captureException(error);
      }
    })();
  }, []);

  // Saves before showing a change, so a failed write never looks saved.
  // Writes run one after another; each builds on the last saved state.
  const apply = useCallback((action: LogAction): Promise<boolean> => {
    const previousWrite = writeQueue.current;
    const write = (async () => {
      try {
        await previousWrite;
      } catch {
        // The earlier caller already received that failure.
      }

      if (!savedState.current.loaded) {
        const error = createLogsNotLoadedError();
        console.error(error);
        Alert.alert(error.message, error.fix, [{ text: t("ok") }]);
        return false;
      }

      const next = reducer(savedState.current, action);
      const error = await store<Omit<LogsState, "loaded">>(
        STORAGE_KEY,
        omit(next, "loaded")
      );
      if (error) {
        Alert.alert(error.message, error.fix, [{ text: t("ok") }]);
        return false;
      }

      savedState.current = next;
      setState(next);
      return true;
    })();
    writeQueue.current = write;
    return write;
  }, []);

  const importState = useCallback(
    (payload: LogsState) => apply({ type: "import", payload }),
    [apply]
  );
  const addLog = useCallback(
    (payload: LogItem) => apply({ type: "add", payload }),
    [apply]
  );
  const editLog = useCallback(
    (payload: AtLeast<LogItem, "id">) => apply({ type: "edit", payload }),
    [apply]
  );
  const updateLogs = useCallback(
    (items: LogsState["items"]) => apply({ type: "batchEdit", payload: items }),
    [apply]
  );
  const deleteLog = useCallback(
    (payload: LogItem["id"]) => apply({ type: "delete", payload }),
    [apply]
  );
  const removeTagFromLogs = useCallback(
    (tagId: string) => apply({ type: "removeTag", payload: tagId }),
    [apply]
  );
  const reset = useCallback(
    () => apply({ type: "reset", payload: INITIAL_STATE }),
    [apply]
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
