import * as Location from "expo-location";
import { Alert, Linking, Platform } from "react-native";
import { t } from "@/lib/translation";

/**
 * Why location can or cannot be used right now.
 *
 * - `granted`: Pixy may read the location
 * - `services_off`: the system switch for location is off, so no prompt can
 *   show and no app permission helps
 * - `denied`: the user refused Pixy and the system will not ask again
 * - `can_ask`: the system prompt can still show
 */
export type LocationAccess = "granted" | "services_off" | "denied" | "can_ask";

/** Android screen with the system location switch. */
const ANDROID_LOCATION_SETTINGS = "android.settings.LOCATION_SOURCE_SETTINGS";

const areServicesEnabled = async (): Promise<boolean> => {
  try {
    return await Location.hasServicesEnabledAsync();
  } catch {
    // Unknown state must not block the user: the permission check decides.
    return true;
  }
};

/** Decides which of the four cases applies. Never asks. */
export const getLocationAccess = async (): Promise<LocationAccess> => {
  if (!(await areServicesEnabled())) {
    return "services_off";
  }
  const { granted, canAskAgain } =
    await Location.getForegroundPermissionsAsync();
  if (granted) {
    return "granted";
  }
  return canAskAgain ? "can_ask" : "denied";
};

/**
 * Opens the best settings screen for the system location switch.
 *
 * - Android: the location screen
 * - iOS: no public API opens Settings > Privacy & Security > Location
 *   Services. `Linking.openSettings()` opens the Pixy page, so the alert text
 *   names the path
 */
const openLocationServicesSettings = async () => {
  if (Platform.OS === "android") {
    try {
      await Linking.sendIntent(ANDROID_LOCATION_SETTINGS);
      return;
    } catch {
      // No handler for the intent. Fall back to the app settings page.
    }
  }
  await Linking.openSettings();
};

/** Tells the user to switch on system Location Services. */
export const showLocationServicesOff = () => {
  Alert.alert(
    t("location_services_off_title"),
    Platform.OS === "android"
      ? t("location_services_off_message_android")
      : t("location_services_off_message_ios"),
    [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("location_open_settings"),
        onPress: () => {
          void openLocationServicesSettings();
        },
      },
    ]
  );
};

/** Tells the user location access is off for Pixy and offers app settings. */
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
 * Makes sure Pixy may read the location. Shows the system prompt when it can
 * and an explaining alert when it cannot. Returns `true` when access is
 * granted.
 */
export const ensureLocationAccess = async (): Promise<boolean> => {
  const access = await getLocationAccess();
  if (access === "granted") {
    return true;
  }
  if (access === "services_off") {
    showLocationServicesOff();
    return false;
  }
  if (access === "can_ask") {
    const { granted } = await Location.requestForegroundPermissionsAsync();
    if (granted) {
      return true;
    }
  }
  showLocationDenied();
  return false;
};
