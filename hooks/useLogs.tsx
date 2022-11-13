import { Buffer } from "buffer";
import dayjs from "dayjs";
import _ from "lodash";
import { v4 as uuidv4 } from "uuid";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer
} from "react";
import { DATE_FORMAT } from "../constants/Config";
import { load, store } from "../helpers/storage";
import { AtLeast } from "../types";
import { useAnalytics } from "./useAnalytics";
import { Tag as ITag } from "./useTags";

export const STORAGE_KEY = "PIXEL_TRACKER_LOGS";

export const RATING_KEYS = [
  "extremely_good",
  "very_good",
  "good",
  "neutral",
  "bad",
  "very_bad",
  "extremely_bad",
];

export interface LogItem {
  id: string;
  date: string;
  rating: typeof RATING_KEYS[number];
  message: string;
  createdAt: string;
  tags?: (ITag & {
    title?: string;
    color?: string;
  })[];
}

export interface LogsState {
  loaded?: boolean;
  items: {
    [date: string]: LogItem;
  };
}

type LogAction = |
{ type: "import"; payload: LogsState } |
{ type: "add"; payload: LogItem } |
{ type: "edit"; payload: AtLeast<LogItem, 'date'> } |
{ type: "batchEdit"; payload: { items: { [id: string]: LogItem } } } |
{ type: "delete"; payload: LogItem['id'] } |
{ type: "reset", payload: LogsState };

export interface UpdaterValue {
  addLog: (item: LogItem) => void;
  editLog: (item: Partial<LogItem>) => void;
  updateLogs: (items: LogsState["items"]) => void;
  deleteLog: (id: LogItem['id']) => void;
  reset: () => void;
  import: (data: LogsState) => void;
}

interface StateValue extends LogsState { }

const LogStateContext = createContext<StateValue>(undefined as any);
const LogUpdaterContext = createContext<UpdaterValue>(undefined as any);

function reducer(state: LogsState, action: LogAction): LogsState {
  switch (action.type) {
    case "import":
      return {
        ...action.payload as LogsState,
        loaded: true,
      };
    case "add":
      state.items[action.payload.date] = action.payload;
      return { ...state };
    case "edit":
      state.items[action.payload.date] = {
        ...state.items[action.payload.date],
        ...action.payload,
      };
      return { ...state };
    case "batchEdit":
      state.items = action.payload.items;
      return {
        ...state,
      };
    case "delete":
      const newItems = Object.values(state.items).filter(
        (item) => item.id !== action.payload
      );
      return {
        ...state,
        items: _.keyBy(newItems, "date"),
      };
    case "reset":
      return {
        ...action.payload,
        loaded: true,
      };
  }
}

const migrate = (data: LogsState): LogsState => {
  const newItems: LogItem[] = []

  for (const [key, value] of Object.entries(data.items)) {
    const date = dayjs(key).format(DATE_FORMAT)

    const newItem = { ...value }

    if (!newItem.createdAt) newItem.createdAt = dayjs(date).toISOString()
    if (!newItem.id) newItem.id = uuidv4()

    newItems.push(newItem)
  }

  return {
    ...data,
    items: _.keyBy(newItems, 'date'),
  };
};

function LogsProvider({ children }: { children: React.ReactNode }) {
  const analyitcs = useAnalytics()

  const INITIAL_STATE: LogsState = {
    loaded: false,
    items: {},
  };

  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  useEffect(() => {
    (async () => {
      const value = await load<LogsState>(STORAGE_KEY);
      const size = Buffer.byteLength(JSON.stringify(value))
      const megaBytes = Math.round(size / 1024 / 1024 * 100) / 100;
      analyitcs.track('loaded_logs', { size: megaBytes, unit: 'mb' })
      if (value !== null) {
        dispatch({
          type: "import",
          payload: migrate(value),
        });
      } else {
        dispatch({
          type: "import",
          payload: {
            ...INITIAL_STATE,
          },
        });
      }
    })();
  }, []);

  useEffect(() => {
    if (state.loaded) {
      store<Omit<LogsState, 'loaded'>>(STORAGE_KEY, _.omit(state, "loaded"));
    }
  }, [JSON.stringify(state)]);

  const importState = useCallback((data: LogsState) => {
    dispatch({
      type: "import",
      payload: data,
    });
  }, []);

  const addLog = useCallback((payload: LogItem) => dispatch({ type: "add", payload, }), []);
  const editLog = useCallback((payload: AtLeast<LogItem, 'date'>) => dispatch({ type: "edit", payload, }), []);
  const updateLogs = useCallback((items: LogsState["items"]) => dispatch({ type: "batchEdit", payload: { items } }), []);
  const deleteLog = useCallback((payload: LogItem['id']) => dispatch({ type: "delete", payload, }), []);
  const reset = useCallback(() => dispatch({ type: "reset", payload: INITIAL_STATE }), []);

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
