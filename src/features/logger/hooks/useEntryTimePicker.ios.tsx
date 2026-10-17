import { BottomSheet, RNHostView } from "@expo/ui";
import { presentationCornerRadius } from "@expo/ui/swift-ui/modifiers";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useColors from "@/hooks/useColors";
import { getLocale } from "@/lib/translation";
import { ENTRY_TIME_MINUTE_INTERVAL, clampToNow } from "../entryTime";
import type {
  EntryTimePicker,
  EntryTimePickerOptions,
} from "./entryTimePickerTypes";

const sheetModifiers = [presentationCornerRadius(16)];

/**
 * Entry date and time picker on iOS: native SwiftUI sheet that fits an
 * inline calendar with a time field. Each change applies at once. Swipe
 * down or outside tap closes it. Future dates and times are disabled.
 */
export const useEntryTimePicker = ({
  value,
  onChange,
}: EntryTimePickerOptions): EntryTimePicker => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);

  return {
    open: () => setIsOpen(true),
    sheet: (
      <BottomSheet
        isPresented={isOpen}
        onDismiss={() => setIsOpen(false)}
        contentPadding={0}
        containerColor={colors.bottomSheetBackground}
        modifiers={sheetModifiers}
      >
        <RNHostView matchContents>
          <View
            style={{
              paddingTop: 16,
              paddingHorizontal: 16,
              paddingBottom: insets.bottom,
            }}
          >
            <DateTimePicker
              testID="logger-date-picker"
              value={value}
              mode="datetime"
              display="inline"
              locale={getLocale()}
              minuteInterval={ENTRY_TIME_MINUTE_INTERVAL}
              maximumDate={new Date()}
              onChange={(event, date) => {
                if (event.type === "set" && date !== undefined) {
                  onChange(clampToNow(date));
                }
              }}
            />
          </View>
        </RNHostView>
      </BottomSheet>
    ),
  };
};
