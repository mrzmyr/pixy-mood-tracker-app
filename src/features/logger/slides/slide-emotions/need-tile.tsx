import Anchor from "lucide-react-native/icons/anchor";
import Bed from "lucide-react-native/icons/bed";
import Compass from "lucide-react-native/icons/compass";
import Gamepad2 from "lucide-react-native/icons/gamepad-2";
import MessagesSquare from "lucide-react-native/icons/messages-square";
import Wrench from "lucide-react-native/icons/wrench";
import { Pressable, useColorScheme, View } from "react-native";
import { Label } from "@/components/typography";
import { RADIUS } from "@/constants/radius";
import useColors from "@/hooks/use-colors";
import useHaptics from "@/hooks/use-haptics";
import { t } from "@/lib/translation";
import type { Emotion } from "@/types";
import { RATING_LABELS } from "./need-rating-types";
import { RatingIcon } from "./need-rating";
import type { NeedConfig, NeedKey, NeedState } from "./needs";

/**
 * Glyph of each need. Each glyph means this need only: no emotion icon
 * (`emotion-icons.ts`) and no other screen uses it.
 */
const NEED_ICONS = {
  body: Bed,
  safety: Anchor,
  connection: MessagesSquare,
  autonomy: Compass,
  competence: Wrench,
  joy: Gamepad2,
} as const satisfies Record<NeedKey, typeof Bed>;

const ICON_SIZE = 20;

/**
 * One need on the needs board: glyph, name, rating, and the feelings picked
 * for it. Unrated needs say "Not rated". Tap opens the need sheet.
 */
export const NeedTile = ({
  need,
  state,
  picked,
  onPress,
}: {
  need: NeedConfig;
  state?: NeedState;
  /** Selected feelings that belong to this need. */
  picked: Emotion[];
  onPress: () => void;
}) => {
  const colors = useColors();
  const haptics = useHaptics();
  const colorScheme = useColorScheme();
  const Icon = NEED_ICONS[need.key];
  const stateLabel = state ? t(RATING_LABELS[state]) : t("log_needs_not_rated");
  const pickedLabel = picked.map((emotion) => emotion.label).join(", ");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[t(need.label), stateLabel, pickedLabel]
        .filter(Boolean)
        .join(", ")}
      accessibilityHint={t(need.description)}
      testID={`needs-${need.key}`}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 112,
        padding: 14,
        // Top-aligned, so names line up across tiles of one row.
        gap: 12,
        borderRadius: RADIUS.md,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor:
          colorScheme === "light" ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)",
        backgroundColor: colors.logCardBackground,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Icon size={ICON_SIZE} color={colors.textSecondary} />
      <View style={{ gap: 2 }}>
        <Label size={16} strong numberOfLines={1}>
          {t(need.label)}
        </Label>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {state && <RatingIcon value={state} color={colors.text} />}
          <Label
            size={14}
            testID={`needs-${need.key}-state`}
            style={{ color: colors.textSecondary }}
          >
            {stateLabel}
          </Label>
        </View>
        {picked.length > 0 && (
          <Label
            size={14}
            numberOfLines={1}
            testID={`needs-${need.key}-picked`}
            style={{ color: colors.tint }}
          >
            {pickedLabel}
          </Label>
        )}
      </View>
    </Pressable>
  );
};
