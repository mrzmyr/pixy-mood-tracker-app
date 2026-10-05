import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type { LogItem } from "@/features/logs";
import { createMissingProviderError } from "@/lib/errors";
import { toLogDate } from "@/lib/logDates";
import { finalizeDraft, hasDraftContent } from "./finalizeDraft";
import type { FinalizedDraft, LogDraft } from "./finalizeDraft";

/** Draft and its verbs, shared by the logger slides. */
export interface LogDraftValue {
  draft: LogDraft;
  /** A setter ran since the logger opened or since `discard`. */
  isDirty: boolean;
  /** See `hasDraftContent`. */
  hasContent: boolean;
  setRating: (rating: LogItem["rating"]) => void;
  /** Sets `dateTime` (ISO) and `date` to its local day. */
  setDateTime: (dateTime: string) => void;
  setEmotions: (emotions: LogItem["emotions"]) => void;
  setTags: (tags: LogItem["tags"]) => void;
  setPeople: (people: LogItem["people"]) => void;
  setMessage: (message: string) => void;
  setPhotos: (photos: LogItem["photos"]) => void;
  /** User pick: sets or removes (`undefined`) the location. */
  setLocation: (location: LogItem["location"]) => void;
  /**
   * Passive location: fills an empty location without making the draft
   * dirty. No-op after the user picked or removed a location.
   */
  prefillLocation: (location: NonNullable<LogItem["location"]>) => void;
  /**
   * Removes a passive location without making the draft dirty, for example
   * after the time moved to another day. Keeps a location the user picked.
   */
  dropPrefilledLocation: () => void;
  /**
   * Finalize the latest draft, including setter calls of the same event.
   * See `finalizeDraft`.
   */
  commit: (existingItems: LogItem[]) => FinalizedDraft;
  /** Restore the initial draft and clear `isDirty`. */
  discard: () => void;
}

const LogDraftContext = createContext<LogDraftValue | null>(null);

/**
 * Holds one logger draft. Mount one per logger: the draft starts at
 * `initialDraft` and ends when the provider unmounts.
 */
export const LogDraftProvider = ({
  initialDraft,
  children,
}: {
  initialDraft: LogDraft;
  children: React.ReactNode;
}) => {
  const initial = useRef(initialDraft);
  const [state, setState] = useState({ draft: initialDraft, isDirty: false });
  // Latest draft for verbs called in the same event as a setter, before
  // React renders the new state.
  const latest = useRef(initialDraft);
  const isLocationPicked = useRef(false);
  const isLocationPrefilled = useRef(false);

  const patch = useCallback((next: Partial<LogDraft>) => {
    latest.current = { ...latest.current, ...next };
    setState({ draft: latest.current, isDirty: true });
  }, []);

  const value = useMemo<LogDraftValue>(
    () => ({
      draft: state.draft,
      isDirty: state.isDirty,
      hasContent: hasDraftContent(state.draft),
      setRating: (rating) => patch({ rating }),
      setDateTime: (dateTime) => patch({ dateTime, date: toLogDate(dateTime) }),
      setEmotions: (emotions) => patch({ emotions }),
      setTags: (tags) => patch({ tags }),
      setPeople: (people) => patch({ people }),
      setMessage: (message) => patch({ message }),
      setPhotos: (photos) => patch({ photos }),
      setLocation: (location) => {
        isLocationPicked.current = true;
        patch({ location });
      },
      prefillLocation: (location) => {
        if (isLocationPicked.current || latest.current.location !== undefined) {
          return;
        }
        isLocationPrefilled.current = true;
        latest.current = { ...latest.current, location };
        setState((current) => ({ ...current, draft: latest.current }));
      },
      dropPrefilledLocation: () => {
        if (isLocationPicked.current || !isLocationPrefilled.current) {
          return;
        }
        isLocationPrefilled.current = false;
        latest.current = { ...latest.current, location: undefined };
        setState((current) => ({ ...current, draft: latest.current }));
      },
      commit: (existingItems) => {
        const finalized = finalizeDraft(latest.current, existingItems);
        setState({ draft: latest.current, isDirty: false });
        return finalized;
      },
      discard: () => {
        isLocationPicked.current = false;
        isLocationPrefilled.current = false;
        latest.current = initial.current;
        setState({ draft: initial.current, isDirty: false });
      },
    }),
    [state, patch]
  );

  return (
    <LogDraftContext.Provider value={value}>
      {children}
    </LogDraftContext.Provider>
  );
};

/** Draft of the logger around the caller. Throws outside `LogDraftProvider`. */
export const useLogDraft = (): LogDraftValue => {
  const context = useContext(LogDraftContext);
  if (context === null) {
    throw createMissingProviderError("useLogDraft", "LogDraftProvider");
  }
  return context;
};
