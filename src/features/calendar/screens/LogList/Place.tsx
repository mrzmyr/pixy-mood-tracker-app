import { MapPin } from "lucide-react-native";
import { Text, View } from "react-native";
import type { LogItem } from "@/features/logs";
import { getLocationLabel, useLocationSetting } from "@/features/location";
import useColors from "@/hooks/useColors";

/**
 * Place of an entry in the card header: a gray map pin and the place name on
 * one line, cut off with an ellipsis when long. Without a name it shows
 * rounded coordinates. Display only: the card has no place edit step. Renders
 * nothing without a stored place or while the `location` flag is off.
 */
export const Place = ({ item }: { item: LogItem }) => {
  const colors = useColors();
  const { isAvailable } = useLocationSetting();
  const { location } = item;

  if (!isAvailable || location === undefined) {
    return null;
  }

  const label = getLocationLabel(location);

  return (
    <View
      testID="log-list-place"
      accessible
      accessibilityRole="text"
      accessibilityLabel={label}
      style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
    >
      <MapPin color={colors.textSecondary} size={14} />
      <Text
        numberOfLines={1}
        style={{ flexShrink: 1, fontSize: 13, color: colors.textSecondary }}
      >
        {label}
      </Text>
    </View>
  );
};
