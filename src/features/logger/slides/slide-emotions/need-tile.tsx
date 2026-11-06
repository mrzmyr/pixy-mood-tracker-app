import Anchor from "lucide-react-native/icons/anchor";
import Battery from "lucide-react-native/icons/battery";
import Compass from "lucide-react-native/icons/compass";
import Handshake from "lucide-react-native/icons/handshake";
import PartyPopper from "lucide-react-native/icons/party-popper";
import TrendingUp from "lucide-react-native/icons/trending-up";
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

/** Glyph of each need. Each glyph means this need only. */
const NEED_ICONS = {
  body: Battery,
  safety: Anchor,
  connection: Handshake,
  autonomy: Compass,
  competence: TrendingUp,
  joy: PartyPopper,
} as const satisfies Record<NeedKey, typeof Battery>;

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
        gap: 12,
        justifyContent: "space-between",
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
