import { MapPin } from "lucide-react-native";
import { Text, View } from "react-native";
import { RADIUS } from "@/constants/Radius";
import useColors from "@/hooks/useColors";
import type { LogLocation } from "@/types";
import { getLocationLabel } from "../places";
import { PlacePreviewMap } from "./PlacePreviewMap";

/**
 * Read-only map tile of a stored place with its name on the bottom, sized
 * like a photo thumbnail. Touches pass through to the parent, so a card
 * around it stays pressable.
 */
export const PlacePreview = ({
  location,
  aspectRatio = 1,
}: {
  location: LogLocation;
  /** Width divided by height. */
  aspectRatio?: number;
}) => {
  const colors = useColors();
  const label = getLocationLabel(location);

  return (
    <View
      testID="place-preview"
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      pointerEvents="none"
      style={{
        width: "100%",
        aspectRatio,
        borderRadius: RADIUS.md,
        overflow: "hidden",
        backgroundColor: colors.backgroundSecondary,
      }}
    >
      <PlacePreviewMap location={location} />
      <View
        style={{
          position: "absolute",
          left: 8,
          right: 8,
          bottom: 8,
          flexDirection: "row",
        }}
      >
        <View
          style={{
            flexShrink: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: RADIUS.full,
            backgroundColor: colors.logCardBackground,
          }}
        >
          <MapPin size={12} color={colors.text} />
          <Text
            numberOfLines={1}
            style={{ flexShrink: 1, fontSize: 13, color: colors.text }}
          >
            {label}
          </Text>
        </View>
      </View>
    </View>
  );
};
