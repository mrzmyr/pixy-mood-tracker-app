import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { useDiscardGuard } from "@/hooks/use-discard-guard";
import { useAnalytics } from "@/state/analytics";
import { useLogState, useLogUpdater } from "@/features/logs";
import { countPhotosBySource } from "@/features/photos";
import { useStoreReviewPrompt } from "@/features/review";

import { EMOTIONS } from "../config";
import { useLogDraft } from "../log-draft";
import type { FinalizedDraft } from "../finalize-draft";
import type { LoggerMode } from "../logger";
import { useSaveAfterSleepFill } from "./use-health-sleep-fill";

/** Emotions that make a save a bad moment for a store review prompt. */
const NEGATIVE_EMOTION_KEYS = new Set<string>();
for (const emotion of EMOTIONS) {
  if (emotion.category === "bad" || emotion.category === "very_bad") {
    NEGATIVE_EMOTION_KEYS.add(emotion.key);
  }
}

/** New entry plus where the logger closes to once the user is done. */
export type SavedEntry = Pick<FinalizedDraft, "item" | "closeTo">;

/**
 * Save and cancel handlers for the logger. Store writes, navigation,
 * analytics, and the photo sweep live here; save rules live in
 * `finalizeDraft`.
 *
 * Every handler except a create save closes the logger and sweeps photo
 * files no stored entry references (draft photos after cancel, removed
 * photos after save). A create save hands the entry to `onCreated` for the
 * confirmation; without `onCreated` it closes the logger. Save first waits
 * for the Apple Health sleep fill, see `useSaveAfterSleepFill`.
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

  const sweepDiscarded = () => {
    analytics.track("logger:flow_cancelled", { mode });
    logDraft.discard();
    logUpdater.sweepPhotos();
  };

  // Android back and the back gesture take this path; the close button and
  // save paths set `allowLeave` first.
  const { allowLeave } = useDiscardGuard({
    isDirty: logDraft.isDirty,
    onDiscard: sweepDiscarded,
  });

  const close = () => {
    allowLeave();
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
      has_location: item.location !== undefined,
    });

    if (mode === "edit") {
      logUpdater.editLog(item);
      close();
      return;
    }

    logUpdater.addLog(item);
    requestStoreReviewPrompt({
      kind: "entry_saved",
      // `logState` predates this save, so count the new entry.
      entriesCount: logState.items.length + 1,
      rating: hasRating ? item.rating : null,
      hasNegativeEmotion: item.emotions.some((key) =>
        NEGATIVE_EMOTION_KEYS.has(key)
      ),
    });

    if (onCreated) {
      onCreated({ item, closeTo });
      return;
    }
    close();
  };

  const cancel = () => {
    analytics.track("logger:flow_cancelled", { mode });
    close();
  };

  const saveAfterSleepFill = useSaveAfterSleepFill({ mode, save });

  return { save: saveAfterSleepFill, cancel };
};
