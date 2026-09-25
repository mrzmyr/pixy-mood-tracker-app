import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { Platform, Switch, Text, View } from "react-native";
import Clock from "./Clock";
import MenuList from "@/components/MenuList";
import MenuListItem from "@/components/MenuListItem";
import NotificationPreview from "./NotificationPreview";
import { t } from "@/helpers/translation";
import { useAnalytics } from "@/state/analytics";
import useColors from "@/hooks/useColors";
import useNotification, { createDailyTrigger } from "@/features/notifications";
import type { SettingsState } from "@/state/settings";
import { useSettings } from "@/state/settings";

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

  const hourAndMinute = reminderTime.split(":");
  const hour = Number(hourAndMinute[0]);
  const minute = Number(hourAndMinute[1]);
  const timeDate = dayjs().hour(hour).minute(minute).toDate();

  const onEnabledChange = async (value: boolean) => {
    let has = await hasPermission();
    if (value && !has) {
      has = await askForPermission();
    }
    if (!value) {
      await cancelAll();
    }
    analytics.track("reminder_enabled_change", { enabled: value });

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
    analytics.track("reminder_time_change", {
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
          isLast={!reminderEnabled}
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
