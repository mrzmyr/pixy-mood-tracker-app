import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { useAnalytics } from "@/state/analytics";
import { useLogState, useLogUpdater } from "@/features/logs";
import { countPhotosBySource } from "@/features/photos";
import { useStoreReviewPrompt } from "@/features/review";

import { useLogDraft } from "../logDraft";
import type { FinalizedDraft } from "../finalizeDraft";
import type { LoggerMode } from "../Logger";

/** New entry plus where the logger closes to once the user is done. */
export type SavedEntry = Pick<FinalizedDraft, "item" | "closeTo">;

/**
 * Save, remove and cancel handlers for the logger. Store writes, navigation,
 * analytics, and the photo sweep live here; save rules live in
 * `finalizeDraft`.
 *
 * Every handler except a create save closes the logger and sweeps photo
 * files no stored entry references (draft photos after cancel, removed
 * photos after save). A create save hands the entry to `onCreated` for the
 * confirmation; without `onCreated` it closes the logger.
 */
export const useLoggerActions = ({
  mode,
  onCreated,
}: {
  mode: LoggerMode;
  /** Called after a new entry is stored, instead of closing the logger. */
  onCreated?: (saved: SavedEntry) => void;
}) => {
  const router = useRouter();
  const analytics = useAnalytics();
  const startedAt = useRef(0);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);
  const logState = useLogState();
  const logUpdater = useLogUpdater();
  const requestStoreReviewPrompt = useStoreReviewPrompt();
  const logDraft = useLogDraft();

  const close = () => {
    logDraft.discard();
    logUpdater.sweepPhotos();
    router.back();
  };

  /** Store the latest draft, including a rating set in the same event. */
  const save = () => {
    const { item, hasRating, closeTo } = logDraft.commit(logState.items);
    const photoCounts = countPhotosBySource({ photos: item.photos });
    analytics.track("logger:log_saved", {
      mode,
      duration_ms: Date.now() - startedAt.current,
      has_rating: hasRating,
      message_length: item.message.length,
      tags_count: item.tags.length,
      people_count: item.people.length,
      emotions_count: item.emotions.length,
      photos_count: item.photos.length,
      photos_day_count: photoCounts.day,
      photos_library_count: photoCounts.library,
    });

    if (mode === "edit") {
      logUpdater.editLog(item);
      close();
      return;
    }

    logUpdater.addLog(item);
    // `logState` predates this save, so count the new entry.
    requestStoreReviewPrompt(logState.items.length + 1);

    if (onCreated) {
      onCreated({ item, closeTo });
      return;
    }
    close();
  };

  const remove = () => {
    analytics.track("logger:log_deleted");
    logUpdater.deleteLog(logDraft.draft.id);
    close();
  };

  const cancel = () => {
    analytics.track("logger:flow_cancelled", { mode });
    close();
  };

  return { save, remove, cancel };
};
