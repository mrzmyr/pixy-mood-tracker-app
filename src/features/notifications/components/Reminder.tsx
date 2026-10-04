import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import dayjs from "dayjs";
import { useEffect, useEffectEvent } from "react";
import { Platform, Switch, Text, View } from "react-native";
import Clock from "./Clock";
import MenuList from "@/components/MenuList";
import MenuListItem from "@/components/MenuListItem";
import NotificationPreview from "./NotificationPreview";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import useColors from "@/hooks/useColors";
import { reminderTimeToDate } from "../reminderTime";
import { useReminder } from "../useReminder";

const Reminder = () => {
  const reminder = useReminder();
  const colors = useColors();
  const analytics = useAnalytics();

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
    analytics.track("reminders:reminder_toggled", {
      enabled: value,
      permission_granted: permissionGranted,
    });
  };

  const onTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    const time = dayjs(selectedDate).format("HH:mm");
    analytics.track("reminders:time_changed", { time });
    void reminder.setTime(time);
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
              marginHorizontal: 16,
              paddingHorizontal: 0,
              borderTopWidth: 1,
              borderTopColor: colors.menuListItemBorder,
              flexDirection: "row",
              alignItems: "center",
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
