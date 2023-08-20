import { DATE_FORMAT } from "@/constants/Config";
import { load, store } from "@/helpers/storage";
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
  useReducer,
} from "react";
import * as Sentry from "sentry-expo";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { AtLeast } from "../../types";
import { useAnalytics } from "./useAnalytics";
import { useFeedback } from "./useFeedback";

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
  sleepQualityAvg: number;
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
  | { type: "reset"; payload: LogsState };

export interface UpdaterValue {
  addLog: (item: LogItem) => void;
  editLog: (item: Partial<LogItem>) => void;
  updateLogs: (items: LogsState["items"]) => void;
  deleteLog: (id: LogItem["id"]) => void;
  reset: () => void;
  import: (data: LogsState) => void;
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
      state.items = action.payload;
      return {
        ...state,
      };
    case "delete":
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.payload),
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

function LogsProvider({ children }: { children: React.ReactNode }) {
  const feedback = useFeedback();
  const analyitcs = useAnalytics();

  const INITIAL_STATE: LogsState = {
    loaded: false,
    items: [],
  };

  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  useEffect(() => {
    (async () => {
      try {
        const value = await load<LogsState>(STORAGE_KEY, feedback);
        const size = Buffer.byteLength(JSON.stringify(value));
        const megaBytes = Math.round((size / 1024 / 1024) * 100) / 100;
        analyitcs.track("loaded_logs", { size: megaBytes, unit: "mb" });
        if (value !== null) {
          dispatch({
            type: "import",
            payload: value,
          });
        } else {
          dispatch({
            type: "import",
            payload: {
              ...INITIAL_STATE,
            },
          });
        }
      } catch (error) {
        Sentry.Native.captureException(error);
      }
    })();
  }, []);

  useEffect(() => {
    if (state.loaded) {
      store<Omit<LogsState, "loaded">>(STORAGE_KEY, _.omit(state, "loaded"));
    }
  }, [JSON.stringify(state)]);

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
      reset,
      import: importState,
    }),
    [addLog, editLog, updateLogs, deleteLog, reset, importState]
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
