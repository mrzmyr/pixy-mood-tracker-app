import { DatePicker, Host } from "@expo/ui/swift-ui";
import {
  datePickerStyle,
  environment,
  labelsHidden,
  opacity,
} from "@expo/ui/swift-ui/modifiers";
import { StyleSheet, Text, View } from "react-native";
import type { ViewStyle } from "react-native";

import useColors from "@/hooks/use-colors";
import { getLocale } from "@/lib/translation";
import { RADIUS } from "@/constants/radius";
import { formatReminderTime } from "../reminder-time";
import type { ClockProps } from "./clock-types";

/**
 * Reminder time on iOS: the compact SwiftUI time picker. This is the view
 * `@expo/ui/community/datetime-picker` renders on iOS, used directly: its
 * `Host` sizes only the height, so the picker gets no width inside a row.
 * This `Host` sizes both axes to the picker.
 *
 * SwiftUI draws the compact pill in system gray and offers no way to change
 * it. With `background`, our own pill shows the time and an almost invisible
 * picker on top takes the taps and opens the system popover.
 */
const Clock = ({
  timeDate,
  onChange,
  background,
  style,
  testID = "reminder-time",
}: ClockProps & { style?: ViewStyle }) => {
  const colors = useColors();
  const picker = (
    <DatePicker
      testID={testID}
      selection={timeDate}
      displayedComponents={["hourAndMinute"]}
      onDateChange={onChange}
      modifiers={[
        datePickerStyle("compact"),
        labelsHidden(),
        environment("locale", getLocale()),
        // Above 0, so SwiftUI still sends taps to the picker.
        ...(background ? [opacity(0.02)] : []),
      ]}
    />
  );

  if (!background) {
    return (
      <Host matchContents style={style}>
        {picker}
      </Host>
    );
  }

  return (
    <View style={style}>
      <View
        style={{
          alignSelf: "flex-start",
          backgroundColor: background,
          borderRadius: RADIUS.sm,
          borderCurve: "continuous",
          paddingHorizontal: 11,
          paddingVertical: 7,
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
      </View>
      <Host style={StyleSheet.absoluteFill}>{picker}</Host>
    </View>
  );
};

export default Clock;
