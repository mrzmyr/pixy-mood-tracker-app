import { DatePicker, Host } from "@expo/ui/swift-ui";
import {
  datePickerStyle,
  environment,
  labelsHidden,
} from "@expo/ui/swift-ui/modifiers";
import type { ViewStyle } from "react-native";

import { getLocale } from "@/lib/translation";
import type { ClockProps } from "./clock-types";

/**
 * Reminder time on iOS: the compact SwiftUI time picker. This is the view
 * `@expo/ui/community/datetime-picker` renders on iOS, used directly: its
 * `Host` sizes only the height, so the picker gets no width inside a row.
 * This `Host` sizes both axes to the picker.
 */
const Clock = ({
  timeDate,
  onChange,
  style,
  testID = "reminder-time",
}: ClockProps & { style?: ViewStyle }) => (
  <Host matchContents style={style}>
    <DatePicker
      testID={testID}
      selection={timeDate}
      displayedComponents={["hourAndMinute"]}
      onDateChange={onChange}
      modifiers={[
        datePickerStyle("compact"),
        labelsHidden(),
        environment("locale", getLocale()),
      ]}
    />
  </Host>
);

export default Clock;
