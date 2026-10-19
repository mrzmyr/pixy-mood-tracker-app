import { Platform } from "react-native";
import { SettingsRow } from "@/components/settings-form";
import { t } from "@/lib/translation";
import { useStartQuickCheckIn } from "./live-activity/quick-check-in-activity-sync";
import { useStartQuickCheckInNotification } from "./notification/quick-check-in-notification-sync";

/**
 * Settings row that shows the check-in now: a Live Activity on iOS, a
 * notification on Android. Testing only: the check-in has no schedule yet.
 */
export const QuickCheckInStartRow = () => {
  const startActivity = useStartQuickCheckIn();
  const startNotification = useStartQuickCheckInNotification();
  const start = Platform.OS === "android" ? startNotification : startActivity;
  return (
    <SettingsRow
      title={t("quick_check_in_start")}
      onPress={start}
      testID="quick-check-in-start"
    />
  );
};
