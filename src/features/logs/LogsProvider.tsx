import { DATE_FORMAT } from "@/constants/Config";
import { load, store } from "@/state/persisted";
import { useStorageLoad } from "@/state/persisted/useStorageLoad";
import type { StorageLoad } from "@/state/persisted/useStorageLoad";

import type { AtLeast, LogItemSchema } from "@/types";
// oxlint-disable-next-line unicorn/prefer-node-protocol -- `buffer` is the npm polyfill bundled for React Native; `node:buffer` does not resolve in Hermes.
import dayjs from "dayjs";
import isArray from "lodash/isArray";
import isEqual from "lodash/isEqual";
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
  useRef,
  useState,
} from "react";
import * as Sentry from "@sentry/react-native";
import { v4 as uuidv4 } from "uuid";
import type z from "zod";
import type { RATING_KEYS } from "@/constants/Ratings";
import { useAnalytics } from "@/state/analytics";
import { createMissingProviderError } from "@/lib/errors";
import {
  deleteUnreferencedPhotos,
  getReferencedFileNames,
} from "@/features/photos";

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
 * legacy data (keyed items, missing ids, tags, emotions, or photos).
 *
 * `sweepPhotos` deletes photo files no stored entry references, after the
 * pending updates are applied. Call it after a change that can drop photo
 * references (logger closed, reset, delete). Never after a data import: it
 * deletes the files of every entry missing from the backup. Never call it
 * while a logger draft holds unsaved photos: it deletes them.
 */
export interface UpdaterValue {
  addLog: (item: LogItem) => void;
  editLog: (item: Partial<LogItem>) => void;
  updateLogs: (items: LogsState["items"]) => void;
  deleteLog: (id: LogItem["id"]) => void;
  removeTagFromLogs: (tagId: string) => void;
  reset: () => void;
  import: (data: LogsState) => void;
  sweepPhotos: () => void;
}

type StateValue = LogsState;

// SAFETY: every consumer renders inside LogsProvider, which supplies the value; the default is never read.
const LogStateContext = createContext<StateValue>(undefined as never);
// SAFETY: every consumer renders inside LogsProvider, which supplies the value; the default is never read.
const LogUpdaterContext = createContext<UpdaterValue>(undefined as never);
// SAFETY: every consumer renders inside LogsProvider, which supplies the value; the default is never read.
const LogLoadContext = createContext<StorageLoad>(undefined as never);

// Stored data is unvalidated JSON: legacy tag references can be null or
// carry extra keys.
const isTagReference = (tag: LogItem["tags"][number]) =>
  tag?.id !== undefined && Object.keys(tag).length === 1;

const migrate = (data: LogsState): LogsState => {
  const result = {
    ...data,
  };

  if (!isArray(data.items)) {
    result.items = Object.values(result.items);
  }

  result.items = result.items.map((item) => {
    const newItem = { ...item };

    // Date parsing dominates load time with many entries; only entries
    // without timestamps need it.
    if (!newItem.createdAt || !newItem.dateTime) {
      const date = dayjs(item.date).format(DATE_FORMAT);

      if (!newItem.createdAt) {
        newItem.createdAt = dayjs(date).toISOString();
      }
      if (!newItem.dateTime) {
        newItem.dateTime = dayjs(date).toISOString();
      }
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
    if (!newItem.photos) {
      newItem.photos = [];
    }

    newItem.tags = newItem.tags.map((tag) =>
      isTagReference(tag) ? tag : pick(tag, ["id"])
    );

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
    // Return the current state for equal updates (e.g. saving an unchanged
    // log) so React skips the render and nothing is persisted.
    case "edit": {
      let changed = false;
      const items = state.items.map((item) => {
        if (item.id !== action.payload.id) {
          return item;
        }
        const editedItem = { ...item, ...action.payload };
        if (isEqual(editedItem, item)) {
          return item;
        }
        changed = true;
        return editedItem;
      });
      return changed ? { ...state, items } : state;
    }
    case "batchEdit": {
      if (isEqual(state.items, action.payload)) {
        return state;
      }
      return {
        ...state,
        items: action.payload,
      };
    }
    case "delete": {
      const items = state.items.filter((item) => item.id !== action.payload);
      return items.length === state.items.length ? state : { ...state, items };
    }
    // Runs against the reducer's current state, not a caller's snapshot, so
    // logs added in the same tick are kept.
    case "removeTag": {
      if (
        !state.items.some((item) =>
          item.tags.some((tag) => tag.id === action.payload)
        )
      ) {
        return state;
      }
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
  const analytics = useAnalytics();

  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const loadedValue = useRef<LogsState | null>(null);
  const {
    load: storageLoad,
    markReady,
    markFailed,
  } = useStorageLoad(STORAGE_KEY);
  const storageStatus = storageLoad.status;
  // Bumped by `sweepPhotos`; the sweep effect reads committed items.
  const [photoSweepRequest, setPhotoSweepRequest] = useState(0);
  const lastPhotoSweep = useRef<number | null>(null);

  // Effect event: the load effect runs once on mount but tracks with the
  // latest analytics instance.
  const trackLoadedLogs = useEffectEvent((megaBytes: number) => {
    analytics.track("app:logs_loaded", { size_mb: megaBytes });
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
        markReady();

        loadedValue.current = value;
      } catch (error) {
        markFailed(error);
        Sentry.captureException(error);
      }
    })();
  }, [markReady, markFailed]);

  // Measuring re-serializes every log, so it runs after the loaded logs
  // have rendered instead of delaying the first render.
  useEffect(() => {
    if (storageStatus !== "ready") {
      return;
    }
    try {
      const size = new TextEncoder().encode(
        JSON.stringify(loadedValue.current)
      ).length;
      const megaBytes = Math.round((size / 1024 / 1024) * 100) / 100;
      trackLoadedLogs(megaBytes);
    } catch (error) {
      Sentry.captureException(error);
    }
    loadedValue.current = null;
  }, [storageStatus]);

  useEffect(() => {
    if (storageStatus === "ready" && state.loaded) {
      store<Omit<LogsState, "loaded">>(STORAGE_KEY, omit(state, "loaded"));
    }
  }, [state, storageStatus]);

  // Effect event: sweeps against the latest committed items without
  // re-running the effect below on every edit.
  const sweepUnreferencedPhotos = useEffectEvent(() => {
    try {
      deleteUnreferencedPhotos({
        referencedFileNames: getReferencedFileNames({ items: state.items }),
      });
    } catch (error) {
      console.error(error);
      Sentry.captureException(error);
    }
  });

  // Runs once after logs load and once per `sweepPhotos` request. Never
  // runs after a failed load: unread entries reference photos too.
  useEffect(() => {
    if (
      storageStatus !== "ready" ||
      !state.loaded ||
      lastPhotoSweep.current === photoSweepRequest
    ) {
      return;
    }
    lastPhotoSweep.current = photoSweepRequest;
    sweepUnreferencedPhotos();
  }, [storageStatus, state.loaded, photoSweepRequest]);

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
  const sweepPhotos = useCallback(
    () => setPhotoSweepRequest((request) => request + 1),
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
      sweepPhotos,
    }),
    [
      addLog,
      editLog,
      updateLogs,
      deleteLog,
      removeTagFromLogs,
      reset,
      importState,
      sweepPhotos,
    ]
  );

  const stateValue: StateValue = useMemo(
    () => ({
      ...state,
    }),
    [state]
  );

  return (
    <LogStateContext.Provider value={stateValue}>
      <LogUpdaterContext.Provider value={updaterValue}>
        <LogLoadContext.Provider value={storageLoad}>
          {children}
        </LogLoadContext.Provider>
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

/** Load status of the logs store; `error` means stored logs exist but could not be read. */
const useLogLoad = (): StorageLoad => {
  const context = useContext(LogLoadContext);
  if (context === undefined) {
    throw createMissingProviderError("useLogLoad", "LogsProvider");
  }
  return context;
};

export { LogsProvider, useLogLoad, useLogState, useLogUpdater };
