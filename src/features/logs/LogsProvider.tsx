import { DATE_FORMAT } from "@/constants/Config";
import { createPersistedStore } from "@/state/persisted/createPersistedStore";
import type { Load } from "@/state/persisted/createPersistedStore";

import type { AtLeast, LogItemSchema } from "@/types";
// oxlint-disable-next-line unicorn/prefer-node-protocol -- `buffer` is the npm polyfill bundled for React Native; `node:buffer` does not resolve in Hermes.
import dayjs from "dayjs";
import isArray from "lodash/isArray";
import isEqual from "lodash/isEqual";
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

/** Logs store state. Readiness lives in `useLogLoad()`. */
export interface LogsState {
  items: LogItem[];
}

type LogAction =
  | { type: "import"; payload: LogsState }
  | { type: "add"; payload: LogItem }
  | { type: "edit"; payload: AtLeast<LogItem, "id"> }
  | { type: "batchEdit"; payload: LogItem[] }
  | { type: "delete"; payload: LogItem["id"] }
  | { type: "removeTag"; payload: string }
  | { type: "removePerson"; payload: string }
  | { type: "reset" };

/**
 * Mutations for the logs store from `useLogUpdater`.
 *
 * `editLog` shallow-merges into the entry with the same `id` and ignores
 * unknown ids. `updateLogs` replaces all entries. `import` also migrates
 * legacy data (keyed items, missing ids, tags, people, emotions, or photos).
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
  /** Strips a deleted person from every entry that references them. */
  removePersonFromLogs: (personId: string) => void;
  reset: () => void;
  import: (data: LogsState) => void;
  sweepPhotos: () => void;
}

const PhotoSweepContext = createContext<(() => void) | undefined>(undefined);

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
    // Entries from before the people feature have no `people` key.
    if (!newItem.people) {
      newItem.people = [];
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
      return migrate(action.payload);
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
    case "removePerson": {
      if (
        !state.items.some((item) =>
          item.people.some((person) => person.id === action.payload)
        )
      ) {
        return state;
      }
      return {
        ...state,
        items: state.items.map((item) =>
          item.people.some((person) => person.id === action.payload)
            ? {
                ...item,
                people: item.people.filter(
                  (person) => person.id !== action.payload
                ),
              }
            : item
        ),
      };
    }
    case "reset": {
      return { items: [] };
    }
    default: {
      return state;
    }
  }
};

const logsStore = createPersistedStore<LogsState, LogAction>({
  key: STORAGE_KEY,
  name: "Logs",
  initial: () => ({ items: [] }),
  hydrate: (stored) => (stored === null ? { items: [] } : migrate(stored)),
  reducer,
});

/**
 * Deletes photo files no stored entry references: once after logs load and
 * once per `sweepPhotos` request. Never after a failed load: unread entries
 * reference photos too.
 */
const PhotoSweepProvider = ({ children }: { children: React.ReactNode }) => {
  const { items } = logsStore.useState();
  const { status } = logsStore.useLoad();
  // Bumped by `sweepPhotos`; the sweep effect reads committed items.
  const [photoSweepRequest, setPhotoSweepRequest] = useState(0);
  const lastPhotoSweep = useRef<number | null>(null);

  // Effect event: sweeps against the latest committed items without
  // re-running the effect below on every edit.
  const sweepUnreferencedPhotos = useEffectEvent(() => {
    try {
      deleteUnreferencedPhotos({
        referencedFileNames: getReferencedFileNames({ items }),
      });
    } catch (error) {
      console.error(error);
      Sentry.captureException(error);
    }
  });

  useEffect(() => {
    if (status !== "ready" || lastPhotoSweep.current === photoSweepRequest) {
      return;
    }
    lastPhotoSweep.current = photoSweepRequest;
    sweepUnreferencedPhotos();
  }, [status, photoSweepRequest]);

  const sweepPhotos = useCallback(
    () => setPhotoSweepRequest((request) => request + 1),
    []
  );

  return (
    <PhotoSweepContext.Provider value={sweepPhotos}>
      {children}
    </PhotoSweepContext.Provider>
  );
};

const LogsProvider = ({ children }: { children: React.ReactNode }) => {
  const analytics = useAnalytics();

  // Measuring re-serializes every log, so it runs after the loaded logs
  // have rendered instead of delaying the first render.
  const trackLoadedLogs = (stored: LogsState | null) => {
    try {
      const size = new TextEncoder().encode(JSON.stringify(stored)).length;
      const megaBytes = Math.round((size / 1024 / 1024) * 100) / 100;
      analytics.track("app:logs_loaded", { size_mb: megaBytes });
    } catch (error) {
      Sentry.captureException(error);
    }
  };

  return (
    <logsStore.Provider onLoad={trackLoadedLogs}>
      <PhotoSweepProvider>{children}</PhotoSweepProvider>
    </logsStore.Provider>
  );
};

const useLogState = (): LogsState => logsStore.useState();

const useLogUpdater = (): UpdaterValue => {
  const dispatch = logsStore.useDispatch();
  const sweepPhotos = useContext(PhotoSweepContext);
  if (sweepPhotos === undefined) {
    throw createMissingProviderError("useLogUpdater", "LogsProvider");
  }

  return useMemo(
    () => ({
      addLog: (payload: LogItem) => dispatch({ type: "add", payload }),
      editLog: (payload: AtLeast<LogItem, "id">) =>
        dispatch({ type: "edit", payload }),
      updateLogs: (items: LogsState["items"]) =>
        dispatch({ type: "batchEdit", payload: items }),
      deleteLog: (payload: LogItem["id"]) =>
        dispatch({ type: "delete", payload }),
      removeTagFromLogs: (tagId: string) =>
        dispatch({ type: "removeTag", payload: tagId }),
      removePersonFromLogs: (personId: string) =>
        dispatch({ type: "removePerson", payload: personId }),
      reset: () => dispatch({ type: "reset" }),
      import: (data: LogsState) => dispatch({ type: "import", payload: data }),
      sweepPhotos,
    }),
    [dispatch, sweepPhotos]
  );
};

/** Load status of the logs store; `error` means stored logs exist but could not be read. */
const useLogLoad = (): Load => logsStore.useLoad();

export { LogsProvider, useLogLoad, useLogState, useLogUpdater };
