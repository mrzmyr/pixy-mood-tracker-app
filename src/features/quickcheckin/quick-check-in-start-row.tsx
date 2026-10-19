import { SettingsRow } from "@/components/settings-form";
import { t } from "@/lib/translation";
import { useStartQuickCheckIn } from "./live-activity/quick-check-in-activity-sync";

/**
 * Settings row that shows the Lock Screen check-in now. Testing only: the
 * check-in has no schedule yet.
 */
export const QuickCheckInStartRow = () => {
  const start = useStartQuickCheckIn();
  return (
    <SettingsRow
      title={t("quick_check_in_start")}
      onPress={start}
      testID="quick-check-in-start"
    />
  );
};
