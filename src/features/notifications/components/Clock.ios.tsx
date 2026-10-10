import DateTimePicker from "@react-native-community/datetimepicker";
import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";

import type { ViewStyle } from "react-native";
import { getLocale } from "@/lib/translation";

const Clock = ({
  timeDate,
  onChange,
  style,
}: {
  timeDate: Date;
  onChange: (event: DateTimePickerEvent, date?: Date) => void;
  style?: ViewStyle;
}) => (
  <DateTimePicker
    locale={getLocale()}
    testID="reminder-time"
    style={style}
    mode="time"
    value={timeDate}
    onChange={onChange}
  />
);

export default Clock;
