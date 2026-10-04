import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { Platform, Switch, Text, View } from "react-native";
import Clock from "./Clock";
import MenuList from "@/components/MenuList";
import MenuListItem from "@/components/MenuListItem";
import NotificationPreview from "./NotificationPreview";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import useColors from "@/hooks/useColors";
import useNotification, { createDailyTrigger } from "../Notifications";
import { reminderTimeToDate } from "../reminderTime";
import { useSettings } from "@/state/settings";
import type { SettingsState } from "@/state/settings";

const Reminder = () => {
  const { setSettings, settings } = useSettings();
  const { askForPermission, hasPermission, schedule, cancelAll } =
    useNotification();

  const [reminderEnabled, setReminderEnabled] = useState(
    settings.reminderEnabled
  );
  const [reminderTime, setReminderTime] = useState(settings.reminderTime);
  const colors = useColors();
  const analytics = useAnalytics();

  const timeDate = reminderTimeToDate(reminderTime);
  const hour = timeDate.getHours();
  const minute = timeDate.getMinutes();

  const onEnabledChange = async (value: boolean) => {
    let has = await hasPermission();
    if (value && !has) {
      has = await askForPermission();
    }
    if (!value) {
      await cancelAll();
    }
    analytics.track("reminders:reminder_toggled", {
      enabled: value,
      permission_granted: Boolean(has),
    });

    const enable = value && Boolean(has);

    setReminderEnabled(enable);
  };

  useEffect(() => {
    (async () => {
      await cancelAll();
      if (reminderEnabled) {
        await schedule({
          trigger: createDailyTrigger(hour, minute),
        });
      }

      setSettings((currentSettings: SettingsState) => ({
        ...currentSettings,
        reminderEnabled,
        reminderTime,
      }));
    })();
  }, [
    reminderEnabled,
    reminderTime,
    hour,
    minute,
    schedule,
    cancelAll,
    setSettings,
  ]);

  const onTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    analytics.track("reminders:time_changed", {
      time: dayjs(selectedDate).format("HH:mm"),
    });
    setReminderTime(dayjs(selectedDate).format("HH:mm"));
  };

  return (
    <View>
      <View
        style={{
          opacity: reminderEnabled ? 1 : 0.5,
          marginBottom: 20,
        }}
      >
        <NotificationPreview />
      </View>
      <MenuList>
        <MenuListItem
          title={t("reminder")}
          iconRight={
            <Switch
              onValueChange={() => onEnabledChange(!reminderEnabled)}
              value={reminderEnabled}
              testID="reminder-enabled"
            />
          }
        />
        {reminderEnabled && (
          <View
            style={{
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              width: "100%",
            }}
          >
            <View
              style={{
                flex: 1,
              }}
            >
              <Text
                style={{
                  color: colors.text,
                  fontSize: 17,
                }}
              >
                {t("time")}
              </Text>
            </View>
            <View
              style={{
                flex: Platform.OS === "ios" ? 1 : 0,
              }}
            >
              <Clock onChange={onTimeChange} timeDate={timeDate} />
            </View>
          </View>
        )}
      </MenuList>
    </View>
  );
};

export default Reminder;
