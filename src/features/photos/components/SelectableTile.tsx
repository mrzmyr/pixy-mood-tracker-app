import { Image } from "expo-image";
import { Check, ImageOff } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import type { PhotoTile } from "../hooks/usePhotoSelection";

const RADIUS = 12;
const RING_WIDTH = 3;
const BADGE_SIZE = 24;
const BADGE_INSET = 6;
const DIMMED_OPACITY = 0.4;
// Sits on the photo, not on a themed surface, so it stays the same in both
// color schemes for contrast.
const BADGE_UNSELECTED_BACKGROUND = "rgba(0, 0, 0, 0.3)";
const BADGE_UNSELECTED_BORDER = "white";
const IMPORTING_OVERLAY = "rgba(0, 0, 0, 0.35)";

/**
 * Square photo tile with a selection state, the one interaction of the
 * photos step. Selected: blue ring and filled check. Unselected: empty
 * circle. A spinner covers the tile while its file imports. `isDimmed`
 * fades unselected tiles at the photo limit.
 */
export const SelectableTile = ({
  tile,
  index,
  count,
  size,
  isDimmed,
  onPress,
  onLongPress,
}: {
  tile: PhotoTile;
  /** Position in the grid, from 0. Used for accessibility labels. */
  index: number;
  count: number;
  size: number;
  isDimmed: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}) => {
  const colors = useColors();
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const position = index + 1;
  const isMissing = failedUri === tile.uri;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="imagebutton"
      accessibilityLabel={t("photos_thumbnail_label", {
        index: position,
        count,
      })}
      accessibilityState={{ selected: tile.isSelected, busy: tile.isImporting }}
      testID={`photo-tile-${position}`}
      style={{
        width: size,
        height: size,
        borderRadius: RADIUS,
        overflow: "hidden",
        backgroundColor: colors.backgroundSecondary,
        opacity: isDimmed ? DIMMED_OPACITY : 1,
      }}
    >
      {isMissing ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ImageOff color={colors.textSecondary} size={24} />
        </View>
      ) : (
        <Image
          source={{ uri: tile.uri }}
          style={{ flex: 1 }}
          contentFit="cover"
          recyclingKey={tile.key}
          accessibilityIgnoresInvertColors
          onError={() => setFailedUri(tile.uri)}
        />
      )}
      {tile.isImporting && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: IMPORTING_OVERLAY,
          }}
        >
          <ActivityIndicator color="white" />
        </View>
      )}
      {tile.isSelected && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            borderRadius: RADIUS,
            borderWidth: RING_WIDTH,
            borderColor: colors.checkboxCheckedBackground,
          }}
        />
      )}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: BADGE_INSET,
          right: BADGE_INSET,
          width: BADGE_SIZE,
          height: BADGE_SIZE,
          borderRadius: BADGE_SIZE / 2,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: tile.isSelected ? 0 : 1.5,
          borderColor: BADGE_UNSELECTED_BORDER,
          backgroundColor: tile.isSelected
            ? colors.checkboxCheckedBackground
            : BADGE_UNSELECTED_BACKGROUND,
        }}
      >
        {tile.isSelected && (
          <Check color={colors.checkboxCheckedText} size={16} strokeWidth={3} />
        )}
      </View>
    </Pressable>
  );
};
