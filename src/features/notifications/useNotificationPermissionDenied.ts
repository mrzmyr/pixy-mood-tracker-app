import * as Notifications from "expo-notifications";
import { useCallback, useEffect, useState } from "react";
import { AppState, Platform } from "react-native";

/** True when the user denied notifications for Pixy in system settings. */
export const readPermissionDenied = async () => {
  if (Platform.OS === "web") {
    return false;
  }
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === Notifications.PermissionStatus.DENIED;
  } catch {
    // Unknown permission shows no note. The toggle still asks on its own.
    return false;
  }
};

/**
 * Whether notification permission is denied. Reads on mount and on every
 * return to the foreground, so the value follows a change in system settings.
 * `refresh` reads again, for example after the toggle asked for permission.
 */
export const useNotificationPermissionDenied = (
  read: () => Promise<boolean> = readPermissionDenied
) => {
  const [denied, setDenied] = useState(false);

  const refresh = useCallback(async () => {
    setDenied(await read());
  }, [read]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const value = await read();
      if (active) {
        setDenied(value);
      }
    };
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void load();
      }
    });
    void load();
    return () => {
      active = false;
      subscription.remove();
    };
  }, [read]);

  return { denied, refresh };
};
