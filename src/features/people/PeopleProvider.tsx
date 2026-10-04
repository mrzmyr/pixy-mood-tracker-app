import omit from "lodash/omit";
import { z } from "zod";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import { useLogUpdater } from "@/features/logs";
import { useContentStableValue } from "@/hooks/useContentStableValue";
import { createMissingProviderError } from "@/lib/errors";
import { load, store } from "@/state/persisted";
import { useStorageLoad } from "@/state/persisted/useStorageLoad";
import type { StorageLoad } from "@/state/persisted/useStorageLoad";
import { deleteAllAvatars, deleteAvatar, removeOrphanAvatars } from "./avatars";

/** AsyncStorage key for people. Changing it orphans all stored people. */
export const STORAGE_KEY = "PIXEL_TRACKER_PEOPLE";

/**
 * Someone the user spends time with. Log entries reference a person by `id`
 * only, so a rename follows the history.
 *
 * Archived people stay on existing entries but are hidden from the logger
 * slide, statistics, and filters unless the entry already has them.
 */
export interface Person {
  id: string;
  /** Display name, at most `MAX_TAG_LENGTH` characters. */
  name: string;
  /** Relative path `people/<id>.jpg`, never an absolute URI. `null` shows the fallback icon. */
  avatar: string | null;
  /** OS contact id from the picker; used only to detect a repeated pick. */
  contactId?: string;
  isArchived?: boolean;
  /** ISO timestamp of when the person was added. */
  createdAt: string;
  /** ISO timestamp of the last avatar change; part of the image cache key. */
  updatedAt?: string;
}

/** People store state. Nothing is persisted while `loaded` is `false`. */
export interface PeopleState {
  loaded?: boolean;
  people: Person[];
}

type StateAction =
  | { type: "add"; payload: Person }
  | { type: "edit"; payload: Person }
  | { type: "delete"; payload: Person["id"] }
  | { type: "import"; payload: PeopleState }
  | { type: "reset"; payload: PeopleState };

interface UpdaterValue {
  createPerson: (person: Person) => void;
  updatePerson: (person: Person) => void;
  /** Removes the person, their avatar file, and their references on entries. */
  deletePerson: (personId: Person["id"]) => void;
  /** Clears every person and the avatar folder. */
  reset: () => void;
  import: (data: PeopleState) => void;
}

// SAFETY: every consumer renders inside PeopleProvider, which supplies the value; the default is never read.
const PeopleStateContext = createContext<PeopleState>(undefined as never);
// SAFETY: every consumer renders inside PeopleProvider, which supplies the value; the default is never read.
const PeopleUpdaterContext = createContext<UpdaterValue>(undefined as never);
// SAFETY: every consumer renders inside PeopleProvider, which supplies the value; the default is never read.
const PeopleLoadContext = createContext<StorageLoad>(undefined as never);

const INITIAL_STATE: PeopleState = { loaded: false, people: [] };

/**
 * Shape of a stored or imported person. A person without `id` or `name` is
 * dropped; a bad `avatar` or `createdAt` is replaced.
 */
const StoredPersonSchema = z.object({
  id: z.string(),
  name: z.string(),
  // oxlint-disable-next-line promise/prefer-await-to-then -- zod `.catch()` is a schema fallback, not a promise.
  avatar: z.string().nullable().catch(null),
  contactId: z.string().optional(),
  isArchived: z.boolean().optional(),
  // oxlint-disable-next-line promise/prefer-await-to-then -- zod `.catch()` is a schema fallback, not a promise.
  createdAt: z.string().catch(() => new Date(0).toISOString()),
  updatedAt: z.string().optional(),
});

// Stored and imported data is unvalidated JSON.
const sanitize = (data: PeopleState): PeopleState => {
  const list = z.array(z.unknown()).safeParse(data.people);
  return {
    ...data,
    people: list.success
      ? list.data.flatMap((value) => {
          const result = StoredPersonSchema.safeParse(value);
          return result.success ? [result.data] : [];
        })
      : [],
  };
};

const reducer = (state: PeopleState, action: StateAction): PeopleState => {
  switch (action.type) {
    case "import": {
      return sanitize({ ...action.payload, loaded: true });
    }
    case "add": {
      return { ...state, people: [...state.people, action.payload] };
    }
    case "edit": {
      return {
        ...state,
        people: state.people.map((person) =>
          person.id === action.payload.id ? action.payload : person
        ),
      };
    }
    case "delete": {
      return {
        ...state,
        people: state.people.filter((person) => person.id !== action.payload),
      };
    }
    case "reset": {
      return { ...action.payload, loaded: true };
    }
    default: {
      return state;
    }
  }
};

/**
 * People store. Must render inside `LogsProvider`: deleting a person strips
 * their references from every entry.
 */
const PeopleProvider = ({ children }: { children: React.ReactNode }) => {
  const logsUpdater = useLogUpdater();
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const {
    load: storageLoad,
    markReady,
    markFailed,
  } = useStorageLoad(STORAGE_KEY);
  const storageStatus = storageLoad.status;
  // Reducer updates can produce equal copies; only content changes should
  // persist or notify consumers.
  const stableState = useContentStableValue(state);

  const createPerson = useCallback(
    (person: Person) => dispatch({ type: "add", payload: person }),
    []
  );
  const updatePerson = useCallback(
    (person: Person) => dispatch({ type: "edit", payload: person }),
    []
  );
  const deletePerson = useCallback(
    (personId: Person["id"]) => {
      const person = state.people.find((item) => item.id === personId);
      dispatch({ type: "delete", payload: personId });
      logsUpdater.removePersonFromLogs(personId);
      if (person?.avatar) {
        void deleteAvatar(person.avatar);
      }
    },
    [logsUpdater, state.people]
  );
  const reset = useCallback(() => {
    dispatch({ type: "reset", payload: { people: [] } });
    void deleteAllAvatars();
  }, []);
  const importData = useCallback(
    (data: PeopleState) => dispatch({ type: "import", payload: data }),
    []
  );

  const updaterValue: UpdaterValue = useMemo(
    () => ({
      createPerson,
      updatePerson,
      deletePerson,
      reset,
      import: importData,
    }),
    [createPerson, updatePerson, deletePerson, reset, importData]
  );

  useEffect(() => {
    (async () => {
      let json: PeopleState | null;
      try {
        json = await load<PeopleState>(STORAGE_KEY);
      } catch (error) {
        // Keep `loaded: false` so the persist effect stays disabled;
        // resetting would overwrite the stored people.
        markFailed(error);
        return;
      }
      const next = json === null ? { people: [] } : json;
      dispatch({ type: "import", payload: next });
      markReady();
      // Files without a person are leftovers of an interrupted write.
      void removeOrphanAvatars(
        sanitize(next).people.map((person) => person.avatar)
      );
    })();
  }, [markReady, markFailed]);

  // Never persist after a failed read: `import` and `reset` set `loaded`, so
  // also require a successful load.
  useEffect(() => {
    if (storageStatus === "ready" && stableState.loaded) {
      store<Omit<PeopleState, "loaded">>(
        STORAGE_KEY,
        omit(stableState, "loaded")
      );
    }
  }, [stableState, storageStatus]);

  return (
    <PeopleStateContext.Provider value={stableState}>
      <PeopleUpdaterContext.Provider value={updaterValue}>
        <PeopleLoadContext.Provider value={storageLoad}>
          {children}
        </PeopleLoadContext.Provider>
      </PeopleUpdaterContext.Provider>
    </PeopleStateContext.Provider>
  );
};

const usePeopleState = (): PeopleState => {
  const context = useContext(PeopleStateContext);
  if (context === undefined) {
    throw createMissingProviderError("usePeopleState", "PeopleProvider");
  }
  return context;
};

const usePeopleUpdater = (): UpdaterValue => {
  const context = useContext(PeopleUpdaterContext);
  if (context === undefined) {
    throw createMissingProviderError("usePeopleUpdater", "PeopleProvider");
  }
  return context;
};

/** Load status of the people store; `error` means stored people exist but could not be read. */
const usePeopleLoad = (): StorageLoad => {
  const context = useContext(PeopleLoadContext);
  if (context === undefined) {
    throw createMissingProviderError("usePeopleLoad", "PeopleProvider");
  }
  return context;
};

export { PeopleProvider, usePeopleLoad, usePeopleState, usePeopleUpdater };
