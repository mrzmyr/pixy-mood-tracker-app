import { reportError } from "@/lib/report-error";
import * as StoreReview from "expo-store-review";
import { APP_VARIANT, HAS_APP_VARIANT } from "@/constants/app-variant";
import { createStructuredError } from "@/lib/errors";
import { useLogState } from "@/features/logs";
import { useAnalytics } from "@/state/analytics";
import { useSettings, useSettingsLoad } from "@/state/settings";
import pkg from "../../../package.json";
import { STORE_REVIEW_DELAY_MS, decideStoreReview } from "./store-review";
import type { StoreReviewGate, StoreReviewMoment } from "./store-review";

// Jest and development or preview (e2e, QA) builds never prompt.
const IS_REVIEW_BUILD = HAS_APP_VARIANT && APP_VARIANT === "production";

// Blocks a second prompt when another moment lands inside the delay, and
// any further prompt in this session after one was requested.
let isPromptScheduled = false;

const reportPromptError = (cause: unknown) => {
  const error = createStructuredError({
    status: "store_review_request_failed",
    message: "Store review prompt could not be requested",
    why: `expo-store-review failed: ${cause instanceof Error ? cause.message : String(cause)}`,
    fix: "Rate Pixy from Settings instead",
  });
  console.error(error);
  reportError(error);
};

/**
 * Returns a callback for good moments: a saved entry, the end of a year
 * report, the end of a month story. It requests the system store review
 * prompt `STORE_REVIEW_DELAY_MS` later when `decideStoreReview` allows it.
 *
 * Never throws and never blocks the moment. The OS decides whether the
 * prompt shows (iOS: max 3 times per 365 days; Google Play: undisclosed
 * quota).
 */
export const useStoreReviewPrompt = () => {
  const { settings, setSettings } = useSettings();
  const settingsLoad = useSettingsLoad();
  const analytics = useAnalytics();
  const { items } = useLogState();

  const requestPrompt = async (
    moment: StoreReviewMoment,
    gate: Omit<StoreReviewGate, "isReviewAvailable">,
    entriesCount: number
  ) => {
    try {
      const isReviewAvailable = await StoreReview.isAvailableAsync();
      const trigger = decideStoreReview(moment, {
        ...gate,
        isReviewAvailable,
      });
      if (trigger === null) {
        isPromptScheduled = false;
        return;
      }

      // Record first: the prompt counts as shown even when the OS hides it.
      const promptedAt = new Date().toISOString();
      setSettings((currentSettings) => ({
        ...currentSettings,
        storeReviewPromptDates: [
          ...currentSettings.storeReviewPromptDates,
          promptedAt,
        ],
        storeReviewPromptedAppVersion: pkg.version,
      }));
      analytics.track("logger:store_review_requested", {
        trigger,
        entries_count: entriesCount,
      });
      await StoreReview.requestReview();
    } catch (error) {
      isPromptScheduled = false;
      reportPromptError(error);
    }
  };

  return (moment: StoreReviewMoment) => {
    const gate = {
      promptDates: settings.storeReviewPromptDates,
      lastPromptAppVersion: settings.storeReviewPromptedAppVersion,
      appVersion: pkg.version,
      now: new Date(),
      isReviewBuild: IS_REVIEW_BUILD,
      isSettingsReady: settingsLoad.status === "ready",
    };
    // `items` predates a save in the same event, so saves pass their count.
    const entriesCount =
      moment.kind === "entry_saved" ? moment.entriesCount : items.length;

    // Availability is async and checked after the delay. Check the rest now
    // so most moments schedule nothing.
    if (
      isPromptScheduled ||
      decideStoreReview(moment, { ...gate, isReviewAvailable: true }) === null
    ) {
      return;
    }

    isPromptScheduled = true;
    setTimeout(() => {
      void requestPrompt(moment, gate, entriesCount);
    }, STORE_REVIEW_DELAY_MS);
  };
};
