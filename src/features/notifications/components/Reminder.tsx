import * as Sentry from "@sentry/react-native";
import { useEffect, useEffectEvent } from "react";
import { Linking, Text, View } from "react-native";
import FlagHighlight from "@/components/FlagHighlight";
import Toggle from "@/components/Toggle";
import Clock from "./Clock";
import MenuList from "@/components/MenuList";
import MenuListItem from "@/components/MenuListItem";
import NotificationPreview from "./NotificationPreview";
import TextInfo from "@/components/TextInfo";
import useColors from "@/hooks/useColors";
import { createStructuredError } from "@/lib/errors";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { useFeatureFlag } from "@/state/featureFlags";
import { reminderTimeToDate, toReminderTime } from "../reminderTime";
import { useNotificationPermissionDenied } from "../useNotificationPermissionDenied";
import { useRecapNotificationsSetting } from "../useRecapNotificationsSetting";
import type { RecapNotificationsSettingResult } from "../useRecapNotificationsSetting";
import { useReminder } from "../useReminder";

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

const Reminder = () => {
  const reminder = useReminder();
  const analytics = useAnalytics();
  const colors = useColors();
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
    <View>
      <View style={{ marginBottom: 20 }}>
        <NotificationPreview time={timeDate} enabled={reminderEnabled} />
      </View>
      <MenuList>
        <MenuListItem
          title={t("reminder")}
          iconRight={
            <Toggle
              onValueChange={() => onEnabledChange(!reminderEnabled)}
              value={reminderEnabled}
              testID="reminder-enabled"
            />
          }
        />
        {reminderEnabled && (
          <MenuListItem
            title={t("time")}
            iconRight={<Clock onChange={onTimeChange} timeDate={timeDate} />}
          />
        )}
      </MenuList>
      {denied && (
        <TextInfo>
          {t("reminder_permission_denied")}{" "}
          <Text
            accessibilityRole="link"
            style={{ color: colors.link }}
            onPress={() => {
              void Linking.openSettings();
            }}
          >
            {t("location_open_settings")}
          </Text>
        </TextInfo>
      )}
      {isRecapsOn && (
        <View style={{ marginTop: 20 }}>
          <FlagHighlight flag="recaps">
            <MenuList>
              <MenuListItem
                title={t("recaps_notifications_setting")}
                iconRight={
                  <Toggle
                    onValueChange={() => onRecapsChange(!recaps.enabled)}
                    value={recaps.enabled}
                    testID="recap-notifications-enabled"
                  />
                }
              />
            </MenuList>
            <TextInfo>{t("recaps_notifications_hint")}</TextInfo>
          </FlagHighlight>
        </View>
      )}
    </View>
  );
};

export default Reminder;
