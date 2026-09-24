import { DATE_FORMAT } from "@/constants/Config";
import Alert from "@/components/Alert";
import { load, store } from "@/helpers/storage";
import { t } from "@/helpers/translation";
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

type LogAction =
  | { type: "import"; payload: LogsState }
  | { type: "add"; payload: LogItem }
  | { type: "edit"; payload: AtLeast<LogItem, "id"> }
  | { type: "batchEdit"; payload: LogItem[] }
  | { type: "delete"; payload: LogItem["id"] }
  | { type: "removeTag"; payload: string }
  | { type: "reset"; payload: LogsState };

// Each updater resolves `true` once the change is saved.
export interface UpdaterValue {
  addLog: (item: LogItem) => Promise<boolean>;
  editLog: (item: AtLeast<LogItem, "id">) => Promise<boolean>;
  updateLogs: (items: LogsState["items"]) => Promise<boolean>;
  deleteLog: (id: LogItem["id"]) => Promise<boolean>;
  removeTagFromLogs: (tagId: string) => Promise<boolean>;
  reset: () => Promise<boolean>;
  import: (data: LogsState) => Promise<boolean>;
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

const INITIAL_STATE: LogsState = {
  loaded: false,
  items: [],
};

const LOGS_NOT_LOADED_ERROR = {
  status: "logs_not_loaded",
  message: "Logs could not be saved",
  why: "Stored logs are still loading or could not be read",
  fix: "Restart the app and try again",
};

function LogsProvider({ children }: { children: React.ReactNode }) {
  const analyitcs = useAnalytics();

  const [state, setState] = useState(INITIAL_STATE);
  const stateRef = useRef(INITIAL_STATE);
  const writes = useRef(Promise.resolve(true));

  useEffect(() => {
    (async () => {
      try {
        const value = await load<LogsState>(STORAGE_KEY);
        stateRef.current = reducer(INITIAL_STATE, {
          type: "import",
          payload: value ?? INITIAL_STATE,
        });
        setState(stateRef.current);

        try {
          const size = Buffer.byteLength(JSON.stringify(value));
          const megaBytes = Math.round((size / 1024 / 1024) * 100) / 100;
          analyitcs.track("loaded_logs", { size: megaBytes, unit: "mb" });
        } catch (error) {
          Sentry.captureException(error);
        }
      } catch (error) {
        Sentry.captureException(error);
      }
    })();
  }, []);

  // Saves before showing a change, so a failed write never looks saved.
  // Writes are queued so each one builds on the last saved state.
  // Resolves `true` when the change was saved.
  const apply = useCallback((action: LogAction) => {
    const write = writes.current.then(async () => {
      const next = reducer(stateRef.current, action);
      const error = stateRef.current.loaded
        ? await store(STORAGE_KEY, _.omit(next, "loaded"))
        : LOGS_NOT_LOADED_ERROR;
      if (error) {
        Alert.alert(error.message, error.fix, [{ text: t("ok") }]);
        return false;
      }
      stateRef.current = next;
      setState(next);
      return true;
    });
    writes.current = write.catch(() => false);
    return write;
  }, []);

  const importState = useCallback((payload: LogsState) => apply({ type: "import", payload }), [apply]);
  const addLog = useCallback((payload: LogItem) => apply({ type: "add", payload }), [apply]);
  const editLog = useCallback((payload: AtLeast<LogItem, "id">) => apply({ type: "edit", payload }), [apply]);
  const updateLogs = useCallback((payload: LogItem[]) => apply({ type: "batchEdit", payload }), [apply]);
  const deleteLog = useCallback((payload: LogItem["id"]) => apply({ type: "delete", payload }), [apply]);
  const removeTagFromLogs = useCallback((payload: string) => apply({ type: "removeTag", payload }), [apply]);
  const reset = useCallback(() => apply({ type: "reset", payload: INITIAL_STATE }), [apply]);

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
    [addLog, editLog, updateLogs, deleteLog, removeTagFromLogs, reset, importState]
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
