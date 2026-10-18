import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { ENTRY_TIME_MINUTE_INTERVAL, clampToNow } from "../entry-time";
import type {
  EntryTimePicker,
  EntryTimePickerOptions,
} from "./entry-time-picker-types";

/**
 * Entry date and time picker on Android: Material date dialog, then time
 * dialog, like the reminder clock. Cancel in either dialog keeps the entry
 * time. A time after now becomes now.
 */
export const useEntryTimePicker = ({
  value,
  onChange,
}: EntryTimePickerOptions): EntryTimePicker => ({
  open: () => {
    DateTimePickerAndroid.open({
      value,
      mode: "date",
      maximumDate: new Date(),
      onChange: (dateEvent, day) => {
        if (dateEvent.type !== "set" || day === undefined) {
          return;
        }
        DateTimePickerAndroid.open({
          value: day,
          mode: "time",
          minuteInterval: ENTRY_TIME_MINUTE_INTERVAL,
          onChange: (timeEvent, time) => {
            if (timeEvent.type === "set" && time !== undefined) {
              onChange(clampToNow(time));
            }
          },
        });
      },
    });
  },
  sheet: null,
});
