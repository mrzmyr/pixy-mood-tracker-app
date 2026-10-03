import { X } from "lucide-react-native";
import { ActivityIndicator, Pressable, View } from "react-native";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { TileImage } from "./TileImage";

const RADIUS = 12;
const BADGE_SIZE = 24;
const BADGE_INSET = 6;
// Hit area of the remove button in the top-right corner (iOS HIG minimum).
const REMOVE_TARGET = 44;
const PRESSED_OPACITY = 0.8;
// Sits on the photo, not on a themed surface, so it stays the same in both
// color schemes for contrast.
const BADGE_BACKGROUND = "rgba(0, 0, 0, 0.55)";
const BADGE_FOREGROUND = "white";
const IMPORTING_OVERLAY = "rgba(0, 0, 0, 0.35)";

/**
 * Square tile of a photo attached to the draft entry. A tap opens the
 * viewer. The remove button in the top-right corner (44 pt hit area)
 * removes the photo without asking: the entry is a draft until save. A
 * spinner covers the tile while its file imports; remove still works then.
 */
export const AttachedTile = ({
  uri,
  recyclingKey,
  index,
  count,
  size,
  isImporting,
  onOpen,
  onRemove,
}: {
  uri: string;
  recyclingKey: string;
  /** Position in the entry, from 0. Used for accessibility labels. */
  index: number;
  count: number;
  size: number;
  isImporting: boolean;
  onOpen: () => void;
  onRemove: () => void;
}) => {
  const colors = useColors();
  const position = index + 1;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: RADIUS,
        overflow: "hidden",
        backgroundColor: colors.backgroundSecondary,
      }}
    >
      <Pressable
        onPress={onOpen}
        accessibilityRole="imagebutton"
        accessibilityLabel={t("photos_thumbnail_label", {
          index: position,
          count,
        })}
        accessibilityState={{ busy: isImporting }}
        testID={`photo-tile-${position}`}
        style={({ pressed }) => ({
          flex: 1,
          opacity: pressed ? PRESSED_OPACITY : 1,
        })}
      >
        <TileImage uri={uri} recyclingKey={recyclingKey} />
        {isImporting && (
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
      </Pressable>
      <Pressable
        onPress={onRemove}
        accessibilityRole="button"
        accessibilityLabel={t("photos_remove_label", { index: position })}
        testID={`photo-tile-${position}-remove`}
        style={({ pressed }) => ({
          position: "absolute",
          top: 0,
          right: 0,
          width: REMOVE_TARGET,
          height: REMOVE_TARGET,
          alignItems: "flex-end",
          padding: BADGE_INSET,
          opacity: pressed ? PRESSED_OPACITY : 1,
        })}
      >
        <View
          style={{
            width: BADGE_SIZE,
            height: BADGE_SIZE,
            borderRadius: BADGE_SIZE / 2,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: BADGE_BACKGROUND,
          }}
        >
          <X color={BADGE_FOREGROUND} size={16} strokeWidth={3} />
        </View>
      </Pressable>
    </View>
  );
};
