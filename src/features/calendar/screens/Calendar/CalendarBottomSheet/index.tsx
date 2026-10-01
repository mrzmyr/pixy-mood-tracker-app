import { BottomSheet, RNHostView } from "@expo/ui";
import { Keyboard, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCalendarFilters } from "../../../filters";
import useColors from "@/hooks/useColors";
import { Body } from "./Body";

/**
 * Calendar filter sheet, opened from the tab header's filter button.
 *
 * Native `@expo/ui` sheet: SwiftUI on iOS, Material 3 on Android. Swipe,
 * outside tap, and Android Back close it and clear the filters. Visibility
 * follows `useCalendarFilters().isOpen`.
 */
export const CalendarBottomSheet = () => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const calendarFilters = useCalendarFilters();

  const close = () => {
    Keyboard.dismiss();
    calendarFilters.close();
  };

  return (
    <BottomSheet
      isPresented={calendarFilters.isOpen}
      onDismiss={close}
      snapPoints={["half", "full"]}
      contentPadding={0}
      containerColor={colors.bottomSheetBackground}
    >
      <RNHostView>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom }}
        >
          <Body />
        </ScrollView>
      </RNHostView>
    </BottomSheet>
  );
};
