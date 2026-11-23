import { reportError } from "@/lib/report-error";
import { useEffect, useEffectEvent } from "react";
import { Linking } from "react-native";
import {
  SettingsForm,
  SettingsRow,
  SettingsSection,
  SettingsSwitch,
} from "@/components/settings-form";
import Clock from "./clock";
import NotificationPreview from "./notification-preview";
import { createStructuredError } from "@/lib/errors";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { useFeatureFlag } from "@/state/feature-flags";
import { reminderTimeToDate, toReminderTime } from "../reminder-time";
import { useNotificationPermissionDenied } from "../use-notification-permission-denied";
import { useRecapNotificationsSetting } from "../use-recap-notifications-setting";
import type { RecapNotificationsSettingResult } from "../use-recap-notifications-setting";
import { useReminder } from "../use-reminder";

const reportRecapsToggleError = (value: boolean, cause: unknown) => {
  const error = createStructuredError({
    status: "recap_notifications_toggle_failed",
    message: `Recaps could not be turned ${value ? "on" : "off"}`,
    why: `useRecapNotificationsSetting().setEnabled failed: ${cause instanceof Error ? cause.message : String(cause)}`,
    fix: "Try the Recaps toggle in Settings > Reminder again",
  });
  console.error(error);
  reportError(error);
};

/**
 * Settings > Reminders: notification preview, then one section per kind of
 * notification. Evening Reflection is the daily reminder with its time.
 * Recaps (flag `recaps`) arrive at the end of each period.
 */
const Reminder = () => {
  const reminder = useReminder();
  const analytics = useAnalytics();
  const { denied, refresh } = useNotificationPermissionDenied();
  const isRecapsOn = useFeatureFlag("recaps");
  const recaps = useRecapNotificationsSetting();

  const reminderEnabled = reminder.enabled;
  const timeDate = reminderTimeToDate(reminder.time);

  // Reapply the stored reminder on open. Repairs the schedule after a data
  // import or a lost notification. Never asks for permission.
  const reapply = useEffectEvent(() => {
    void reminder.setTime(reminder.time);
  });
  useEffect(() => {
    reapply();
  }, []);

  const onEnabledChange = async (value: boolean) => {
    let permissionGranted: boolean;
    if (value) {
      const result = await reminder.enable(reminder.time);
      permissionGranted = result.status === "enabled";
    } else {
      const result = await reminder.disable();
      ({ permissionGranted } = result);
    }
    void refresh();
    analytics.track("reminders:reminder_toggled", {
      enabled: value,
      permission_granted: permissionGranted,
    });
  };

  const onRecapsChange = async (value: boolean) => {
    let result: RecapNotificationsSettingResult;
    try {
      result = await recaps.setEnabled(value);
    } catch (error) {
      // The setting saves only after success, so the toggle keeps its state.
      reportRecapsToggleError(value, error);
      void refresh();
      return;
    }
    void refresh();
    const { permissionGranted } = result;
    analytics.track("reminders:recaps_toggled", {
      enabled: value,
      permission_granted: permissionGranted,
    });
  };

  const onTimeChange = (selectedDate: Date) => {
    const time = toReminderTime(selectedDate);
    analytics.track("reminders:time_changed", { time });
    void reminder.setTime(time);
  };

  return (
    <SettingsForm
      header={<NotificationPreview time={timeDate} enabled={reminderEnabled} />}
    >
      <SettingsSection
        footer={
          denied
            ? t("reminder_permission_denied")
            : t("evening_reflection_hint")
        }
      >
        <SettingsSwitch
          label={t("evening_reflection")}
          value={reminderEnabled}
          onValueChange={onEnabledChange}
          testID="reminder-enabled"
        />
        {reminderEnabled && (
          <SettingsRow
            title={t("time")}
            accessory={<Clock onChange={onTimeChange} timeDate={timeDate} />}
          />
        )}
        {denied && (
          <SettingsRow
            title={t("location_open_settings")}
            kind="link"
            onPress={() => {
              void Linking.openSettings();
            }}
          />
        )}
      </SettingsSection>
      {isRecapsOn && (
        <SettingsSection footer={t("recaps_notifications_hint")}>
          <SettingsSwitch
            label={t("recaps_notifications_setting")}
            value={recaps.enabled}
            onValueChange={onRecapsChange}
            testID="recap-notifications-enabled"
          />
        </SettingsSection>
      )}
    </SettingsForm>
  );
};

export default Reminder;
