import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { Pressable } from "react-native";
import type { ViewStyle } from "react-native";

import { Label } from "@/components/typography";
import useColors from "@/hooks/use-colors";
import { formatReminderTime } from "../reminder-time";
import { RADIUS } from "@/constants/radius";
import type { ClockProps } from "./clock-types";

/**
 * Reminder time on Android: a pill with the time. Pressing it opens the
 * system time dialog, which follows the device 12/24-hour setting.
 * The dialog opens imperatively: Settings rows host the pill in an
 * `RNHostView`, and a picker view mounted next to it replaced the pill
 * without showing the dialog.
 */
const Clock = ({
  timeDate,
  background,
  onChange,
  style,
  testID = "reminder-time",
}: ClockProps & { style?: ViewStyle }) => {
  const colors = useColors();

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={() =>
        DateTimePickerAndroid.open({
          value: timeDate,
          mode: "time",
          onChange: (event, date) => {
            if (event.type === "set" && date !== undefined) {
              onChange(date);
            }
          },
        })
      }
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: background ?? colors.backgroundSecondary,
        borderRadius: RADIUS.sm,
        paddingLeft: 10,
        paddingRight: 10,
        paddingTop: 5,
        paddingBottom: 5,
        ...style,
      }}
    >
      <Label
        size={16}
        style={{ color: colors.text, fontVariant: ["tabular-nums"] }}
      >
        {formatReminderTime(timeDate)}
      </Label>
    </Pressable>
  );
};

export default Clock;
