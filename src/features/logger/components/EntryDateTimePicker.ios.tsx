import { DatePicker, Host } from "@expo/ui/swift-ui";
import type { DatePickerComponent } from "@expo/ui/swift-ui";
import {
  accessibilityHint,
  datePickerStyle,
  environment,
  labelsHidden,
} from "@expo/ui/swift-ui/modifiers";
import { View } from "react-native";
import { getLocale, t } from "@/lib/translation";
import { clampToNow } from "../entryDateTime";
import type { EntryDateTimePickerProps } from "./entryDateTimePickerTypes";

const CompactPicker = ({
  testID,
  components,
  selection,
  onChange,
}: {
  testID: string;
  components: DatePickerComponent[];
  selection: Date;
  onChange: (dateTime: string) => void;
}) => (
  <Host matchContents>
    <DatePicker
      testID={testID}
      selection={selection}
      displayedComponents={components}
      range={{ end: new Date() }}
      onDateChange={(date) => onChange(clampToNow(date).toISOString())}
      modifiers={[
        datePickerStyle("compact"),
        labelsHidden(),
        environment("locale", getLocale()),
        accessibilityHint(t("logger_date_hint")),
      ]}
    />
  </Host>
);

/**
 * Entry time on iOS: SwiftUI compact date and time buttons. Each opens the
 * system popover. Times after now are disabled.
 */
export const EntryDateTimePicker = ({
  value,
  onChange,
}: EntryDateTimePickerProps) => {
  const selection = value === null ? new Date() : new Date(value);

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <CompactPicker
        testID="logger-date"
        components={["date"]}
        selection={selection}
        onChange={onChange}
      />
      <CompactPicker
        testID="logger-time"
        components={["hourAndMinute"]}
        selection={selection}
        onChange={onChange}
      />
    </View>
  );
};
