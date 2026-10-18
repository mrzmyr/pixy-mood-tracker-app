import * as Sentry from "@sentry/react-native";
import { useEffect, useEffectEvent } from "react";
import { Linking, View } from "react-native";
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
  Sentry.captureException(error);
};

/**
 * Settings > Reminder: notification preview, then a native grouped list with
 * the reminder switch, its time, and the recaps switch.
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
    <View style={{ flex: 1 }}>
      <View style={{ padding: 20, paddingBottom: 0 }}>
        <NotificationPreview time={timeDate} enabled={reminderEnabled} />
      </View>
      <SettingsForm>
        <SettingsSection
          footer={denied ? t("reminder_permission_denied") : undefined}
        >
          <SettingsSwitch
            label={t("reminder")}
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
          <SettingsSection
            flag="recaps"
            footer={t("recaps_notifications_hint")}
          >
            <SettingsSwitch
              label={t("recaps_notifications_setting")}
              value={recaps.enabled}
              onValueChange={onRecapsChange}
              testID="recap-notifications-enabled"
            />
          </SettingsSection>
        )}
      </SettingsForm>
    </View>
  );
};

export default Reminder;
