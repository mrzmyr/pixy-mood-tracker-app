import { BottomSheet, RNHostView } from "@expo/ui";
import { presentationCornerRadius } from "@expo/ui/swift-ui/modifiers";
import { Keyboard, Platform, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCalendarFilters } from "../../../filters";
import useColors from "@/hooks/useColors";
import { Body } from "./Body";

// Android keeps Material's corner radius: `ModalBottomSheet` has no shape prop.
const sheetModifiers =
  Platform.OS === "ios" ? [presentationCornerRadius(16)] : undefined;

/**
 * Calendar filter sheet, opened from the calendar header Filters button.
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
      modifiers={sheetModifiers}
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
