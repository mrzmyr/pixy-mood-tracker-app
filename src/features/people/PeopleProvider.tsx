import { z } from "zod";
import { useMemo } from "react";
import { useLogUpdater } from "@/features/logs";
import { createPersistedStore } from "@/state/persisted/createPersistedStore";
import type { Load } from "@/state/persisted/createPersistedStore";
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

/** People store state. Readiness lives in `usePeopleLoad()`. */
export interface PeopleState {
  people: Person[];
}

type StateAction =
  | { type: "add"; payload: Person }
  | { type: "edit"; payload: Person }
  | { type: "delete"; payload: Person["id"] }
  | { type: "import"; payload: PeopleState }
  | { type: "reset" };

interface UpdaterValue {
  createPerson: (person: Person) => void;
  updatePerson: (person: Person) => void;
  /** Removes the person, their avatar file, and their references on entries. */
  deletePerson: (personId: Person["id"]) => void;
  /** Clears every person and the avatar folder. */
  reset: () => void;
  import: (data: PeopleState) => void;
}

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
      return sanitize(action.payload);
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
      return { people: [] };
    }
    default: {
      return state;
    }
  }
};

const peopleStore = createPersistedStore<PeopleState, StateAction>({
  key: STORAGE_KEY,
  name: "People",
  initial: () => ({ people: [] }),
  hydrate: (stored) => sanitize(stored ?? { people: [] }),
  reducer,
});

// Files without a person are leftovers of an interrupted write.
const removeOrphans = (_stored: PeopleState | null, state: PeopleState) => {
  void removeOrphanAvatars(state.people.map((person) => person.avatar));
};

/**
 * People store. Must render inside `LogsProvider`: deleting a person strips
 * their references from every entry.
 */
const PeopleProvider = ({ children }: { children: React.ReactNode }) => (
  <peopleStore.Provider onLoad={removeOrphans}>{children}</peopleStore.Provider>
);

const usePeopleState = (): PeopleState => peopleStore.useState();

const usePeopleUpdater = (): UpdaterValue => {
  const dispatch = peopleStore.useDispatch();
  const { people } = peopleStore.useState();
  const logsUpdater = useLogUpdater();

  return useMemo(
    () => ({
      createPerson: (person: Person) =>
        dispatch({ type: "add", payload: person }),
      updatePerson: (person: Person) =>
        dispatch({ type: "edit", payload: person }),
      deletePerson: (personId: Person["id"]) => {
        const person = people.find((item) => item.id === personId);
        dispatch({ type: "delete", payload: personId });
        logsUpdater.removePersonFromLogs(personId);
        if (person?.avatar) {
          void deleteAvatar(person.avatar);
        }
      },
      reset: () => {
        dispatch({ type: "reset" });
        void deleteAllAvatars();
      },
      import: (data: PeopleState) =>
        dispatch({ type: "import", payload: data }),
    }),
    [dispatch, logsUpdater, people]
  );
};

/** Load status of the people store; `error` means stored people exist but could not be read. */
const usePeopleLoad = (): Load => peopleStore.useLoad();

export { PeopleProvider, usePeopleLoad, usePeopleState, usePeopleUpdater };
