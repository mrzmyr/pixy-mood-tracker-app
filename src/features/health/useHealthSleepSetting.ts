import * as Sentry from "@sentry/react-native";
import { Alert } from "react-native";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { useFeatureFlag } from "@/state/featureFlags";
import { useSettings } from "@/state/settings";
import { getHealthSource } from "./healthSource";

/**
 * "Fill From Apple Health" setting of the sleep step.
 *
 * - `isAvailable`: the `apple-health` feature flag is on and the device has
 *   Apple Health
 * - `isEnabled`: available and switched on
 * - `setEnabled(true)` shows the Health access sheet first. HealthKit hides
 *   whether the user allowed reading, so the switch turns on either way
 */
export const useHealthSleepSetting = () => {
  const isFlagOn = useFeatureFlag("apple-health");
  const { settings, setSettings } = useSettings();
  const analytics = useAnalytics();
  const isAvailable = isFlagOn && getHealthSource().isAvailable();

  const setEnabled = async (next: boolean) => {
    if (next) {
      try {
        await getHealthSource().requestSleepAccess();
      } catch (error) {
        Sentry.captureException(error);
        Alert.alert(t("health_error_title"), t("health_error_message"));
        return;
      }
    }
    analytics.track("settings:health_sleep_toggled", { enabled: next });
    setSettings((current) => ({ ...current, healthSleepEnabled: next }));
  };

  return {
    isAvailable,
    isEnabled: isAvailable && settings.healthSleepEnabled,
    setEnabled,
  };
};
