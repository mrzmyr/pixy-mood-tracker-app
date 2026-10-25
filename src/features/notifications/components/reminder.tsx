import { reportError } from "@/lib/report-error";
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
import {
  formatReminderTime,
  reminderTimeToDate,
  toReminderTime,
} from "../reminder-time";
import {
  getQuickCheckInTimes,
  IntervalPicker,
  QuickCheckInStartRow,
  useQuickCheckInSetting,
} from "@/features/quickcheckin";
import type { QuickCheckInSchedule } from "@/state/settings";
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

/** Footer under the quick check-in rows: the times, or why there are none. */
const getQuickCheckInFooter = (
  isEnabled: boolean,
  schedule: QuickCheckInSchedule
) => {
  if (!isEnabled) {
    return t("quick_check_ins_hint");
  }
  const times = getQuickCheckInTimes(schedule);
  if (times.length === 0) {
    return t("quick_check_in_schedule_empty");
  }
  return t("quick_check_in_schedule_footer", {
    times: times
      .map((time) => formatReminderTime(reminderTimeToDate(time)))
      .join(", "),
    count: schedule.everyHours,
  });
};

/**
 * Settings > Reminders: notification preview, then one section per kind of
 * notification. Evening Reflection is the daily reminder with its time.
 * Quick Check-ins (flag `quick-check-in`) repeat every few hours between
 * two times. Recaps (flag `recaps`) arrive at the end of each period.
 */
const Reminder = () => {
  const reminder = useReminder();
  const analytics = useAnalytics();
  const { denied, refresh } = useNotificationPermissionDenied();
  const isRecapsOn = useFeatureFlag("recaps");
  const recaps = useRecapNotificationsSetting();
  const quickCheckIn = useQuickCheckInSetting();
  const { schedule } = quickCheckIn;

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

  const onQuickCheckInChange = async (value: boolean) => {
    await quickCheckIn.setEnabled(value);
    void refresh();
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
        {quickCheckIn.isAvailable && (
          <SettingsSection
            flag="quick-check-in"
            footer={getQuickCheckInFooter(quickCheckIn.isEnabled, schedule)}
          >
            <SettingsSwitch
              label={t("quick_check_ins")}
              value={quickCheckIn.isEnabled}
              onValueChange={onQuickCheckInChange}
              testID="quick-check-in-enabled"
            />
            {quickCheckIn.isEnabled && (
              <SettingsRow
                title={t("quick_check_in_every")}
                accessory={
                  <IntervalPicker
                    value={schedule.everyHours}
                    onChange={(everyHours) =>
                      quickCheckIn.setSchedule({ ...schedule, everyHours })
                    }
                  />
                }
              />
            )}
            {quickCheckIn.isEnabled && (
              <SettingsRow
                title={t("quick_check_in_from")}
                accessory={
                  <Clock
                    testID="quick-check-in-from"
                    timeDate={reminderTimeToDate(schedule.from)}
                    onChange={(date) =>
                      quickCheckIn.setSchedule({
                        ...schedule,
                        from: toReminderTime(date),
                      })
                    }
                  />
                }
              />
            )}
            {quickCheckIn.isEnabled && (
              <SettingsRow
                title={t("quick_check_in_until")}
                accessory={
                  <Clock
                    testID="quick-check-in-until"
                    timeDate={reminderTimeToDate(schedule.until)}
                    onChange={(date) =>
                      quickCheckIn.setSchedule({
                        ...schedule,
                        until: toReminderTime(date),
                      })
                    }
                  />
                }
              />
            )}
            {quickCheckIn.isEnabled && <QuickCheckInStartRow />}
          </SettingsSection>
        )}
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
