import { ActivityIndicator, Pressable, Text, View } from "react-native";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { TileImage } from "./TileImage";
import { RADIUS } from "@/constants/Radius";

const BADGE_SIZE = 24;
const BADGE_INSET = 6;
const SELECTED_BORDER = 3;
const DIMMED_OPACITY = 0.4;
const PRESSED_OPACITY = 0.8;
// Sits on the photo, not on a themed surface, so it stays the same in both
// color schemes for contrast.
const ON_PHOTO = "white";
const RING_BACKGROUND = "rgba(0, 0, 0, 0.15)";
const TAG_BACKGROUND = "rgba(0, 0, 0, 0.5)";
const IMPORTING_OVERLAY = "rgba(0, 0, 0, 0.35)";

/**
 * Square photo tile that checks and unchecks in place, like the system
 * photo picker. Checked: tinted border and a badge with `order`, the
 * photo's position in the entry. Unchecked: an empty ring. A tap toggles;
 * a long press on a checked tile opens it (`onOpen`), also as the "View"
 * accessibility action. `isDimmed` fades an unchecked tile at the photo
 * limit; the tap still calls `onToggle`, so the caller can explain the
 * limit.
 */
export const PickTile = ({
  uri,
  recyclingKey,
  position,
  count,
  order,
  tag,
  size,
  isDimmed,
  isImporting,
  onToggle,
  onOpen,
}: {
  /** Stored file, picked file, or library asset (`ph://`). */
  uri: string;
  recyclingKey: string;
  /** Position in the grid, from 1. Used for labels and test ids. */
  position: number;
  /** Tiles in the grid. */
  count: number;
  /** Position in the entry, from 1. `null`: unchecked. */
  order: number | null;
  /** Short label in the bottom-left corner, for example "Library". */
  tag?: string;
  size: number;
  isDimmed: boolean;
  isImporting: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) => {
  const colors = useColors();
  const isChecked = order !== null;

  return (
    <Pressable
      onPress={onToggle}
      onLongPress={isChecked ? onOpen : undefined}
      accessibilityRole="checkbox"
      accessibilityLabel={[
        t("photos_thumbnail_label", { index: position, count }),
        tag,
      ]
        .filter(Boolean)
        .join(", ")}
      accessibilityHint={t(
        isChecked ? "photos_pick_hint_checked" : "photos_pick_hint"
      )}
      accessibilityState={{ checked: isChecked, busy: isImporting }}
      accessibilityActions={
        isChecked ? [{ name: "view", label: t("photos_pick_view") }] : []
      }
      onAccessibilityAction={({ nativeEvent }) => {
        if (nativeEvent.actionName === "view") {
          onOpen();
        }
      }}
      testID={`photo-pick-${position}`}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: RADIUS.md,
        overflow: "hidden",
        backgroundColor: colors.backgroundSecondary,
        opacity:
          (isDimmed && !isChecked ? DIMMED_OPACITY : 1) *
          (pressed ? PRESSED_OPACITY : 1),
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
          <ActivityIndicator color={ON_PHOTO} />
        </View>
      )}
      {isChecked && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            borderRadius: RADIUS.md,
            borderWidth: SELECTED_BORDER,
            borderColor: colors.tint,
          }}
        />
      )}
      {tag !== undefined && (
        <Text
          pointerEvents="none"
          testID={`photo-pick-${position}-tag`}
          numberOfLines={1}
          style={{
            position: "absolute",
            left: BADGE_INSET,
            bottom: BADGE_INSET,
            maxWidth: size - BADGE_INSET * 2,
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: RADIUS.sm,
            overflow: "hidden",
            backgroundColor: TAG_BACKGROUND,
            color: ON_PHOTO,
            fontSize: 11,
            fontWeight: "600",
          }}
        >
          {tag}
        </Text>
      )}
      <View
        pointerEvents="none"
        testID={isChecked ? `photo-pick-${position}-order` : undefined}
        style={{
          position: "absolute",
          top: BADGE_INSET,
          right: BADGE_INSET,
          width: BADGE_SIZE,
          height: BADGE_SIZE,
          borderRadius: BADGE_SIZE / 2,
          borderWidth: 2,
          borderColor: ON_PHOTO,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isChecked ? colors.tint : RING_BACKGROUND,
        }}
      >
        {isChecked && (
          <Text
            style={{
              color: ON_PHOTO,
              fontSize: 12,
              fontWeight: "700",
              fontVariant: ["tabular-nums"],
            }}
          >
            {order}
          </Text>
        )}
      </View>
    </Pressable>
  );
};
