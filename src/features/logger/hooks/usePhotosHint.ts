import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { useLogState } from "@/features/logs";
import { useAnalytics } from "@/state/analytics";
import { useSettings, useSettingsLoad } from "@/state/settings";
import { shouldShowPhotosHint } from "../photosHint";

// No answer from the system counts as enabled: a skipped hint costs nothing.
const getIsReduceMotionEnabled = async () => {
  try {
    return await AccessibilityInfo.isReduceMotionEnabled();
  } catch {
    return true;
  }
};

/**
 * One-time add-photo hint of the note slide.
 *
 * `isVisible` turns `true` when the hint should play. Call `markShown` once
 * it played in full: it sets `photosHintShown`, so no later logger shows it
 * again. A hint cut short (slide left, photo added) shows again next time.
 */
export const usePhotosHint = ({
  isActive,
  draftPhotosCount,
}: {
  isActive: boolean;
  draftPhotosCount: number;
}) => {
  const { settings, setSettings } = useSettings();
  const settingsLoad = useSettingsLoad();
  const logState = useLogState();
  const analytics = useAnalytics();
  const [isReduceMotionEnabled, setIsReduceMotionEnabled] = useState<
    boolean | null
  >(null);

  useEffect(() => {
    let isCurrent = true;
    const load = async () => {
      const isEnabled = await getIsReduceMotionEnabled();
      if (isCurrent) {
        setIsReduceMotionEnabled(isEnabled);
      }
    };
    void load();
    return () => {
      isCurrent = false;
    };
  }, []);

  const isVisible = shouldShowPhotosHint({
    isActive,
    isSettingsReady: settingsLoad.status === "ready" && settings.loaded,
    isHintShown: settings.photosHintShown,
    hasStoredPhotos: logState.items.some((item) => item.photos.length > 0),
    draftPhotosCount,
    isReduceMotionEnabled,
  });

  const markShown = () => {
    setSettings((current) => ({ ...current, photosHintShown: true }));
    analytics.track("logger:photo_hint_shown");
  };

  return { isVisible, markShown };
};
