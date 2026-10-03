import * as Sentry from "@sentry/react-native";
import * as StoreReview from "expo-store-review";
import { APP_VARIANT, HAS_APP_VARIANT } from "@/constants/AppVariant";
import { createStructuredError } from "@/lib/errors";
import { useAnalytics } from "@/state/analytics";
import { useSettings, useSettingsLoad } from "@/state/settings";
import pkg from "../../../package.json";
import {
  STORE_REVIEW_DELAY_MS,
  STORE_REVIEW_TRIGGER,
  shouldRequestStoreReview,
} from "./storeReview";
import type { StoreReviewInput } from "./storeReview";

// Jest and development or preview (e2e, QA) builds never prompt.
const IS_REVIEW_BUILD = HAS_APP_VARIANT && APP_VARIANT === "production";

// Blocks a second prompt when another save lands inside the delay.
let isPromptScheduled = false;

const reportPromptError = (cause: unknown) => {
  const error = createStructuredError({
    status: "store_review_request_failed",
    message: "Store review prompt could not be requested",
    why: `expo-store-review failed: ${cause instanceof Error ? cause.message : String(cause)}`,
    fix: "Rate Pixy from Settings instead",
  });
  console.error(error);
  Sentry.captureException(error);
};

/**
 * Returns a callback for the logger save flow. It requests the system store
 * review prompt once, `STORE_REVIEW_DELAY_MS` after the save that reaches
 * `STORE_REVIEW_ENTRIES_THRESHOLD` entries.
 *
 * Never throws and never delays the save. The OS decides whether the prompt
 * shows (iOS: max 3 times per 365 days; Google Play: undisclosed quota).
 */
export const useStoreReviewPrompt = () => {
  const { settings, setSettings } = useSettings();
  const settingsLoad = useSettingsLoad();
  const analytics = useAnalytics();

  const requestPrompt = async (
    input: Omit<StoreReviewInput, "isReviewAvailable">
  ) => {
    try {
      const isReviewAvailable = await StoreReview.isAvailableAsync();
      if (!shouldRequestStoreReview({ ...input, isReviewAvailable })) {
        isPromptScheduled = false;
        return;
      }

      // Record first: the prompt counts as shown even when the OS hides it.
      setSettings((currentSettings) => ({
        ...currentSettings,
        storeReviewPromptedAt: new Date().toISOString(),
        storeReviewPromptedAppVersion: pkg.version,
      }));
      analytics.track("logger:store_review_requested", {
        trigger: STORE_REVIEW_TRIGGER,
        entries_count: input.entriesCount,
      });
      await StoreReview.requestReview();
    } catch (error) {
      reportPromptError(error);
    }
  };

  return (entriesCount: number) => {
    const input = {
      entriesCount,
      promptedAt: settings.storeReviewPromptedAt,
      isReviewBuild: IS_REVIEW_BUILD,
      isSettingsReady: settingsLoad.status === "ready" && settings.loaded,
    };

    // Availability is async and checked after the delay. Check the rest now
    // so most saves schedule nothing.
    if (
      isPromptScheduled ||
      !shouldRequestStoreReview({ ...input, isReviewAvailable: true })
    ) {
      return;
    }

    isPromptScheduled = true;
    setTimeout(() => {
      void requestPrompt(input);
    }, STORE_REVIEW_DELAY_MS);
  };
};
