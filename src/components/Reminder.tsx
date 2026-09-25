import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { Platform, Switch, Text, View } from "react-native";
import Clock from "@/components/Clock";
import MenuList from "@/components/MenuList";
import MenuListItem from "@/components/MenuListItem";
import NotificationPreview from "@/components/NotificationPreview";
import { t } from "@/helpers/translation";
import { useAnalytics } from "@/hooks/useAnalytics";
import useColors from "@/hooks/useColors";
import useNotification, { createDailyTrigger } from "@/hooks/useNotifications";
import type { SettingsState } from "@/hooks/useSettings";
import { useSettings } from "@/hooks/useSettings";

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
  const hour = Number.parseInt(hourAndMinute[0]);
  const minute = Number.parseInt(hourAndMinute[1]);
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

      setSettings((settings: SettingsState) => ({
        ...settings,
        reminderEnabled,
        reminderTime,
      }));
    })();
  }, [reminderEnabled, reminderTime]);

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
