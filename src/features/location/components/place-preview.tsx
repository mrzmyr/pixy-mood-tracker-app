import MapPin from "lucide-react-native/icons/map-pin";
import { View } from "react-native";
import { Label } from "@/components/typography";
import { RADIUS } from "@/constants/radius";
import useColors from "@/hooks/use-colors";
import type { LogLocation } from "@/types";
import { getLocationLabel } from "../places";
import { PlacePreviewMap } from "./place-preview-map";

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
        borderCurve: "continuous",
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
          <Label
            size={13}
            numberOfLines={1}
            style={{ flexShrink: 1, color: colors.text }}
          >
            {label}
          </Label>
        </View>
      </View>
    </View>
  );
};
