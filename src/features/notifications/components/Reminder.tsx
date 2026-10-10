import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import dayjs from "dayjs";
import { useEffect, useEffectEvent } from "react";
import { Linking, Text, View } from "react-native";
import Toggle from "@/components/Toggle";
import Clock from "./Clock";
import MenuList from "@/components/MenuList";
import MenuListItem from "@/components/MenuListItem";
import NotificationPreview from "./NotificationPreview";
import TextInfo from "@/components/TextInfo";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { reminderTimeToDate } from "../reminderTime";
import { useNotificationPermissionDenied } from "../useNotificationPermissionDenied";
import { useReminder } from "../useReminder";

const Reminder = () => {
  const reminder = useReminder();
  const analytics = useAnalytics();
  const colors = useColors();
  const { denied, refresh } = useNotificationPermissionDenied();

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

  const onTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type !== "set" || !selectedDate) {
      return;
    }
    const time = dayjs(selectedDate).format("HH:mm");
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
    </View>
  );
};

export default Reminder;
