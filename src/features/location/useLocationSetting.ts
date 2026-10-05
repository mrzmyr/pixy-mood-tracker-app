import { Alert, Linking, Platform } from "react-native";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { useFeatureFlag } from "@/state/featureFlags";
import { useSettings } from "@/state/settings";
import { requestLocationAccess } from "./places";

/** Tells the user location access is off and offers the system settings. */
export const showLocationDenied = () => {
  Alert.alert(t("location_denied_title"), t("location_denied_message"), [
    { text: t("cancel"), style: "cancel" },
    {
      text: t("location_open_settings"),
      onPress: () => {
        void Linking.openSettings();
      },
    },
  ]);
};

/**
 * Check-in location setting.
 *
 * - `isAvailable`: the `location` feature flag is on, outside web
 * - `isEnabled`: available and switched on in Settings > Check-in
 * - `setEnabled(true)` asks for location access first and stays off when
 *   the user denies it
 */
export const useLocationSetting = () => {
  const isFlagOn = useFeatureFlag("location");
  const { settings, setSettings } = useSettings();
  const analytics = useAnalytics();
  const isAvailable = isFlagOn && Platform.OS !== "web";

  const setEnabled = async (next: boolean) => {
    if (next && !(await requestLocationAccess())) {
      showLocationDenied();
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
