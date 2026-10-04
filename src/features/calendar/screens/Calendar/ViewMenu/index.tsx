import { Pressable, Text, View } from "react-native";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import { t } from "@/lib/translation";
import { CALENDAR_VIEWS } from "../../../views";
import { getViewLabel } from "./types";
import type { ViewMenuProps } from "./types";

/**
 * Web build of the "View" header button. `@expo/ui` has no web module, so
 * web shows the views as a segmented row.
 */
export const ViewMenu = ({ view, onChange }: ViewMenuProps) => {
  const colors = useColors();
  const haptics = useHaptics();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t("calendar_view")}
      style={{ flexDirection: "row", gap: 4 }}
    >
      {CALENDAR_VIEWS.map((item) => {
        const isSelected = item === view;
        return (
          <Pressable
            key={item}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            onPress={() => {
              haptics.selection();
              onChange(item);
            }}
            style={({ pressed }) => ({
              paddingHorizontal: 8,
              paddingVertical: 6,
              borderRadius: 8,
              opacity: pressed ? 0.8 : 1,
              backgroundColor: isSelected
                ? colors.calendarItemBackgroundFuture
                : "transparent",
            })}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: "500",
                color: isSelected ? colors.text : colors.linkButtonTextPrimary,
              }}
            >
              {getViewLabel(item)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};
