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
import { toLogDate } from "@/lib/log-dates";
import { finalizeDraft, hasDraftContent } from "./finalize-draft";
import type { FinalizedDraft, LogDraft } from "./finalize-draft";

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
  /**
   * Stores typed note text in the latest draft without re-rendering the
   * logger. Re-renders only when `isDirty` or `hasContent` flips. `commit`
   * and every other setter include the text; `draft.message` shows it after
   * `flushMessage`.
   */
  typeMessage: (message: string) => void;
  /** Publishes text from `typeMessage` to `draft`. No-op when in sync. */
  flushMessage: () => void;
  setPhotos: (photos: LogItem["photos"]) => void;
  /** `null` clears the sleep quality. */
  setSleepQuality: (quality: LogDraft["sleep"]["quality"]) => void;
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
  /** Latest draft, including note text `typeMessage` has not flushed yet. */
  getLatestDraft: () => LogDraft;
  /** Restore the initial draft and clear `isDirty`. */
  discard: () => void;
}

const LogDraftContext = createContext<LogDraftValue | null>(null);

/**
 * Holds one logger draft. Mount one per logger: the draft starts at
 * `initialDraft` and ends when the provider unmounts.
 *
 * `isPrefilled`: the draft starts dirty, so closing asks before discarding
 * content the user did not type in the logger (voice mode).
 */
export const LogDraftProvider = ({
  initialDraft,
  isPrefilled = false,
  children,
}: {
  initialDraft: LogDraft;
  isPrefilled?: boolean;
  children: React.ReactNode;
}) => {
  const initial = useRef(initialDraft);
  const [state, setState] = useState({
    draft: initialDraft,
    isDirty: isPrefilled,
    hasContent: hasDraftContent(initialDraft),
  });
  // Latest draft for verbs called in the same event as a setter, before
  // React renders the new state.
  const latest = useRef(initialDraft);
  const isLocationPicked = useRef(false);
  const isLocationPrefilled = useRef(false);

  const patch = useCallback((next: Partial<LogDraft>) => {
    latest.current = { ...latest.current, ...next };
    setState({
      draft: latest.current,
      isDirty: true,
      hasContent: hasDraftContent(latest.current),
    });
  }, []);

  // Stable, so the message slide can flush from an unmount cleanup.
  const flushMessage = useCallback(() => {
    setState((current) =>
      current.draft === latest.current
        ? current
        : { ...current, draft: latest.current }
    );
  }, []);

  const value = useMemo<LogDraftValue>(
    () => ({
      draft: state.draft,
      isDirty: state.isDirty,
      hasContent: state.hasContent,
      setRating: (rating) => patch({ rating }),
      setDateTime: (dateTime) => patch({ dateTime, date: toLogDate(dateTime) }),
      setEmotions: (emotions) => patch({ emotions }),
      setTags: (tags) => patch({ tags }),
      setPeople: (people) => patch({ people }),
      typeMessage: (message) => {
        latest.current = { ...latest.current, message };
        const hasContent = hasDraftContent(latest.current);
        if (!state.isDirty || hasContent !== state.hasContent) {
          setState({ draft: latest.current, isDirty: true, hasContent });
        }
      },
      flushMessage,
      setPhotos: (photos) => patch({ photos }),
      setSleepQuality: (quality) => patch({ sleep: { quality } }),
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
        setState({
          draft: latest.current,
          isDirty: false,
          hasContent: hasDraftContent(latest.current),
        });
        return finalized;
      },
      getLatestDraft: () => latest.current,
      discard: () => {
        isLocationPicked.current = false;
        isLocationPrefilled.current = false;
        latest.current = initial.current;
        setState({
          draft: initial.current,
          isDirty: false,
          hasContent: hasDraftContent(initial.current),
        });
      },
    }),
    [state, patch, flushMessage]
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
