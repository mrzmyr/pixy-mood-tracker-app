import { Platform } from "react-native";
import { useAnalytics } from "@/state/analytics";
import { useFeatureFlag } from "@/state/featureFlags";
import { useSettings } from "@/state/settings";
import { ensureLocationAccess } from "./access";

/**
 * Check-in location setting.
 *
 * - `isAvailable`: the `location` feature flag is on, outside web
 * - `isEnabled`: available and switched on in Settings > Check-in
 * - `setEnabled(true)` asks for location access first and stays off when
 *   access is missing
 */
export const useLocationSetting = () => {
  const isFlagOn = useFeatureFlag("location");
  const { settings, setSettings } = useSettings();
  const analytics = useAnalytics();
  const isAvailable = isFlagOn && Platform.OS !== "web";

  const setEnabled = async (next: boolean) => {
    if (next && !(await ensureLocationAccess())) {
      return;
    }
    analytics.track("settings:location_toggled", { enabled: next });
    setSettings((current) => ({ ...current, locationEnabled: next }));
  };

  return {
    isAvailable,
    isEnabled: isAvailable && settings.locationEnabled,
    setEnabled,
  };
};
