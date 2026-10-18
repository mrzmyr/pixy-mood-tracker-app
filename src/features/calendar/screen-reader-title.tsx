import { View } from "react-native";
import { t } from "@/lib/translation";

/**
 * Header title for the calendar route. Screen readers get the screen name.
 * Sighted users see nothing: the view has zero size.
 */
export const CalendarScreenReaderTitle = () => (
  <View
    accessible
    accessibilityRole="header"
    accessibilityLabel={t("calendar")}
    style={{ width: 1, height: 1, opacity: 0 }}
  />
);
