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
      commit: (existingItems) => {
        const finalized = finalizeDraft(latest.current, existingItems);
        setState({ draft: latest.current, isDirty: false });
        return finalized;
      },
      discard: () => {
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
