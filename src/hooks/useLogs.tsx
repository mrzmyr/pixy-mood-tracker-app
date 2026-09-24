import { DATE_FORMAT } from "@/constants/Config";
import { snapshotLogs } from "@/helpers/logSnapshots";
import { createStorageError, load, persist } from "@/helpers/storage";
import { LogItemSchema } from "@/types";
import { Buffer } from "buffer";
import dayjs from "dayjs";
import _ from "lodash";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as Sentry from '@sentry/react-native';
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { AtLeast } from "../../types";
import { useAnalytics } from "./useAnalytics";

export const STORAGE_KEY = "PIXEL_TRACKER_LOGS";

export const RATING_MAPPING = {
  extremely_good: 6,
  very_good: 5,
  good: 4,
  neutral: 3,
  bad: 2,
  very_bad: 1,
  extremely_bad: 0,
};

export const SLEEP_QUALITY_MAPPING = {
  very_good: 4,
  good: 3,
  neutral: 2,
  bad: 1,
  very_bad: 0,
};

export const RATING_KEYS = Object.keys(
  RATING_MAPPING
) as (keyof typeof RATING_MAPPING)[];
export const SLEEP_QUALITY_KEYS = Object.keys(
  SLEEP_QUALITY_MAPPING
) as (keyof typeof SLEEP_QUALITY_MAPPING)[];

export type LogItem = z.infer<typeof LogItemSchema>;

export interface LogDay {
  date: string;
  items: LogItem[];
  ratingAvg: (typeof RATING_KEYS)[number];
  sleepQualityAvg: number | null;
}

export interface LogsState {
  loaded?: boolean;
  items: LogItem[];
}

export type LogAction =
  | { type: "import"; payload: LogsState }
  | { type: "add"; payload: LogItem }
  | { type: "edit"; payload: AtLeast<LogItem, "id"> }
  | { type: "batchEdit"; payload: LogItem[] }
  | { type: "delete"; payload: LogItem["id"] }
  | { type: "removeTag"; payload: string }
  | { type: "reset"; payload: LogsState };

// Every updater resolves once the change is written to storage and rejects
// with a storage error (`status`, `message`, `why`, `fix`) when it is not.
export interface UpdaterValue {
  addLog: (item: LogItem) => Promise<void>;
  editLog: (item: AtLeast<LogItem, "id">) => Promise<void>;
  updateLogs: (items: LogsState["items"]) => Promise<void>;
  deleteLog: (id: LogItem["id"]) => Promise<void>;
  removeTagFromLogs: (tagId: string) => Promise<void>;
  reset: () => Promise<void>;
  import: (data: LogsState) => Promise<void>;
  flush: () => Promise<void>;
}

interface StateValue extends LogsState {}

const LogStateContext = createContext<StateValue>(undefined as any);
const LogUpdaterContext = createContext<UpdaterValue>(undefined as any);

function reducer(state: LogsState, action: LogAction): LogsState {
  switch (action.type) {
    case "import":
      return migrate({
        ...(action.payload as LogsState),
        loaded: true,
      });
    case "add":
      return {
        ...state,
        items: [...state.items, action.payload],
      };
    case "edit":
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
    case "batchEdit":
      return {
        ...state,
        items: action.payload,
      };
    case "delete":
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.payload),
      };
    // Runs against the reducer's current state, not a caller's snapshot, so
    // logs added in the same tick are kept.
    case "removeTag":
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
    case "reset":
      return {
        ...action.payload,
        loaded: true,
      };
  }
}

const migrate = (data: LogsState): LogsState => {
  let result = {
    ...data,
  };

  if (!_.isArray(data.items)) {
    result.items = Object.values(result.items);
  }

  result.items = result.items.map((item) => {
    const date = dayjs(item.date).format(DATE_FORMAT);

    const newItem = { ...item };

    if (!newItem.createdAt) newItem.createdAt = dayjs(date).toISOString();
    if (!newItem.dateTime) newItem.dateTime = dayjs(date).toISOString();
    if (!newItem.id) newItem.id = uuidv4();
    if (!newItem.tags) newItem.tags = [];
    if (!newItem.emotions) newItem.emotions = [];

    newItem.tags = newItem.tags.map((tag) => _.pick(tag, ["id"]));

    return newItem;
  });

  return result;
};

// Maximum number of entries each action may remove. Anything above means a
// bug is about to overwrite stored entries, so the write is refused.
const SHRINK_ALLOWANCE: Record<LogAction["type"], number> = {
  add: 0,
  edit: 0,
  removeTag: 0,
  delete: 1,
  batchEdit: Infinity,
  import: Infinity,
  reset: Infinity,
};

export const findUnexpectedShrink = (
  prev: LogsState,
  next: LogsState,
  actionType: LogAction["type"],
) => {
  const removed = prev.items.length - next.items.length;
  const allowedRemovals = SHRINK_ALLOWANCE[actionType];
  if (removed <= allowedRemovals) return null;

  return createStorageError(
    "logs_unexpected_shrink",
    "Change was blocked to protect your entries",
    `Action "${actionType}" would remove ${removed} entries, but at most ${allowedRemovals} may be removed`,
    "Export your data, restart Pixy and report this issue",
  );
};

function LogsProvider({ children }: { children: React.ReactNode }) {
  const analyitcs = useAnalytics();

  const INITIAL_STATE: LogsState = {
    loaded: false,
    items: [],
  };

  const [state, setState] = useState<LogsState>(INITIAL_STATE);
  // The ref holds the latest state so updaters can compute and persist the
  // next state synchronously, without waiting for a render.
  const stateRef = useRef<LogsState>(INITIAL_STATE);
  const storageStatusRef = useRef<"loading" | "ready" | "error">("loading");
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());

  // Writes run one after another, so an older snapshot can never land after
  // a newer one.
  const enqueueWrite = useCallback((next: LogsState): Promise<void> => {
    const write = writeQueueRef.current
      .catch(() => {})
      .then(() =>
        persist<Omit<LogsState, "loaded">>(STORAGE_KEY, _.omit(next, "loaded"))
      );
    writeQueueRef.current = write;
    return write;
  }, []);

  const apply = useCallback((action: LogAction): Promise<void> => {
    if (storageStatusRef.current !== "ready") {
      const error = createStorageError(
        "logs_not_loaded",
        "Entry could not be saved",
        storageStatusRef.current === "loading"
          ? "Stored entries are still loading"
          : "Stored entries could not be loaded, so saving could overwrite them",
        "Restart Pixy and try again",
      );
      Sentry.captureException(error);
      return Promise.reject(error);
    }

    const next = reducer(stateRef.current, action);

    const shrinkError = findUnexpectedShrink(stateRef.current, next, action.type);
    if (shrinkError) {
      Sentry.captureException(shrinkError);
      return Promise.reject(shrinkError);
    }

    stateRef.current = next;
    setState(next);
    return enqueueWrite(next);
  }, [enqueueWrite]);

  // Re-writes the latest in-memory state, e.g. after a failed write.
  const flush = useCallback((): Promise<void> => {
    if (storageStatusRef.current !== "ready") return Promise.resolve();
    return enqueueWrite(stateRef.current);
  }, [enqueueWrite]);

  useEffect(() => {
    (async () => {
      try {
        const value = await load<LogsState>(STORAGE_KEY);
        if (value !== null && Array.isArray(value.items)) {
          void snapshotLogs(value);
        }
        const next = reducer(stateRef.current, {
          type: "import",
          payload: value !== null ? value : { ...INITIAL_STATE },
        });
        stateRef.current = next;
        storageStatusRef.current = "ready";
        setState(next);
        // Persist migration results (e.g. generated ids) right away.
        enqueueWrite(next).catch(() => {});

        try {
          const size = Buffer.byteLength(JSON.stringify(value));
          const megaBytes = Math.round((size / 1024 / 1024) * 100) / 100;
          analyitcs.track("loaded_logs", { size: megaBytes, unit: "mb" });
        } catch (error) {
          Sentry.captureException(error);
        }
      } catch (error) {
        storageStatusRef.current = "error";
        Sentry.captureException(error);
      }
    })();
  }, []);

  const importState = useCallback(
    (data: LogsState) => apply({ type: "import", payload: data }),
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
      flush,
    }),
    [addLog, editLog, updateLogs, deleteLog, removeTagFromLogs, reset, importState, flush]
  );

  const stateValue: StateValue = useMemo(
    () => ({
      ...state,
    }),
    [JSON.stringify(state)]
  );

  return (
    <LogStateContext.Provider value={stateValue}>
      <LogUpdaterContext.Provider value={updaterValue}>
        {children}
      </LogUpdaterContext.Provider>
    </LogStateContext.Provider>
  );
}

function useLogState(): StateValue {
  const context = useContext(LogStateContext);
  if (context === undefined) {
    throw new Error("useLogState must be used within a LogsProvider");
  }
  return context;
}

function useLogUpdater(): UpdaterValue {
  const context = useContext(LogUpdaterContext);
  if (context === undefined) {
    throw new Error("useLogUpdater must be used within a LogsProvider");
  }
  return context;
}

export { LogsProvider, useLogState, useLogUpdater };
