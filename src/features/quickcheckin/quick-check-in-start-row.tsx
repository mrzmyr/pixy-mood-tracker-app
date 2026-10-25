import { useRouter } from "expo-router";
import { Platform } from "react-native";
import { SettingsRow } from "@/components/settings-form";
import { t } from "@/lib/translation";
import { useStartQuickCheckInNotification } from "./notification/quick-check-in-notification-sync";

/**
 * Settings row that starts a check-in now: the quick check-in screen on iOS,
 * the notification on Android.
 */
export const QuickCheckInStartRow = () => {
  const router = useRouter();
  const startNotification = useStartQuickCheckInNotification();
  const start =
    Platform.OS === "android"
      ? startNotification
      : () => router.push("/check-in/new");
  return (
    <SettingsRow
      title={t("quick_check_in_start")}
      onPress={start}
      testID="quick-check-in-start"
    />
  );
};
