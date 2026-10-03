import { Plus } from "lucide-react-native";
import { Pressable, View } from "react-native";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { TileImage } from "./TileImage";

const RADIUS = 12;
const BADGE_SIZE = 24;
const BADGE_INSET = 6;
const DIMMED_OPACITY = 0.4;
const PRESSED_OPACITY = 0.8;
// Sits on the photo, not on a themed surface, so it stays the same in both
// color schemes for contrast.
const BADGE_BACKGROUND = "rgba(0, 0, 0, 0.55)";
const BADGE_FOREGROUND = "white";

/**
 * Square tile of a library photo the entry can take, for example a photo
 * of the entry's day. The whole tile is the button: a tap adds the photo.
 * The plus badge only shows that. `isDimmed` fades the tile at the photo
 * limit; the tap still calls `onAdd`, so the caller can explain the limit.
 */
export const SuggestionTile = ({
  uri,
  recyclingKey,
  index,
  count,
  size,
  isDimmed,
  onAdd,
}: {
  /** Library asset (`ph://`) or file. */
  uri: string;
  recyclingKey: string;
  /** Position in the suggestions, from 0. Used for accessibility labels. */
  index: number;
  count: number;
  size: number;
  isDimmed: boolean;
  onAdd: () => void;
}) => {
  const colors = useColors();
  const position = index + 1;

  return (
    <Pressable
      onPress={onAdd}
      accessibilityRole="button"
      accessibilityLabel={t("photos_thumbnail_label", {
        index: position,
        count,
      })}
      accessibilityHint={t("photos_suggestion_hint")}
      testID={`photo-suggestion-${position}`}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: RADIUS,
        overflow: "hidden",
        backgroundColor: colors.backgroundSecondary,
        opacity:
          (isDimmed ? DIMMED_OPACITY : 1) * (pressed ? PRESSED_OPACITY : 1),
      })}
    >
      <TileImage uri={uri} recyclingKey={recyclingKey} />
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
          backgroundColor: BADGE_BACKGROUND,
        }}
      >
        <Plus color={BADGE_FOREGROUND} size={16} strokeWidth={3} />
      </View>
    </Pressable>
  );
};
