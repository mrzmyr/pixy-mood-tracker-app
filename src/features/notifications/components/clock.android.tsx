import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { useState } from "react";
import { Pressable, Text } from "react-native";
import type { ViewStyle } from "react-native";

import useColors from "@/hooks/use-colors";
import { formatReminderTime } from "../reminder-time";
import { RADIUS } from "@/constants/radius";
import type { ClockProps } from "./clock-types";

/**
 * Reminder time on Android: a pill with the time. Pressing it opens the
 * Material 3 time dialog from `@expo/ui`. The dialog follows the device
 * 12/24-hour setting. It opens on mount, so it renders only while open.
 */
const Clock = ({
  timeDate,
  onChange,
  style,
  testID = "reminder-time",
}: ClockProps & { style?: ViewStyle }) => {
  const colors = useColors();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.backgroundSecondary,
          borderRadius: RADIUS.sm,
          paddingLeft: 10,
          paddingRight: 10,
          paddingTop: 5,
          paddingBottom: 5,
          ...style,
        }}
      >
        <Text
          style={{
            color: colors.text,
            fontSize: 17,
            fontVariant: ["tabular-nums"],
          }}
        >
          {formatReminderTime(timeDate)}
        </Text>
      </Pressable>
      {open && (
        <DateTimePicker
          mode="time"
          presentation="dialog"
          value={timeDate}
          onValueChange={(_event, date) => {
            setOpen(false);
            onChange(date);
          }}
          onDismiss={() => setOpen(false)}
        />
      )}
    </>
  );
};

export default Clock;
