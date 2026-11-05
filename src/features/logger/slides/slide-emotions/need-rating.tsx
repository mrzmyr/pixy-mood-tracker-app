import { Pressable, useColorScheme, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { RADIUS } from "@/constants/radius";
import useColors from "@/hooks/use-colors";
import useHaptics from "@/hooks/use-haptics";
import { t } from "@/lib/translation";
import type { NeedState } from "./needs";
import { RATING_LABELS, RATING_ORDER } from "./need-rating-types";
import type { NeedRatingProps } from "./need-rating-types";

const SEGMENT_WIDTH = 36;
const HEIGHT = 28;
const INSET = 2;
const ICON_SIZE = 12;

const CENTER = ICON_SIZE / 2;
const STROKE = 1.5;
const R = CENTER - STROKE / 2;
const DOT_R = 2;

/** How full the need was: empty ring, ring with a dot, or full circle. */
const RatingIcon = ({ value, color }: { value: NeedState; color: string }) => (
  <Svg width={ICON_SIZE} height={ICON_SIZE}>
    <Circle
      cx={CENTER}
      cy={CENTER}
      r={R}
      stroke={color}
      strokeWidth={STROKE}
      fill={value === "met" ? color : "none"}
    />
    {value === "partly" && (
      <Circle cx={CENTER} cy={CENTER} r={DOT_R} fill={color} />
    )}
  </Svg>
);

/**
 * Need rating: a small segmented control with an empty ring, a ring with a
 * dot, or a full circle for unmet, partly, and met. The native segmented
 * controls draw symbols at full size and in black, too loud next to the need
 * name. Unrated needs show no selected segment. Tapping the selected segment
 * again clears the rating.
 */
export const NeedRating = ({
  label,
  state,
  onChange,
  testID,
}: NeedRatingProps) => {
  const colors = useColors();
  const haptics = useHaptics();
  const colorScheme = useColorScheme();
  const thumbColor =
    colorScheme === "dark" ? colors.logCardBorder : colors.logCardBackground;

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      testID={testID}
      style={{
        flexDirection: "row",
        height: HEIGHT,
        padding: INSET,
        borderRadius: RADIUS.full,
        borderCurve: "continuous",
        backgroundColor: colors.logActionBackground,
      }}
    >
      {RATING_ORDER.map((value) => {
        const isSelected = state === value;
        return (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityLabel={t(RATING_LABELS[value])}
            accessibilityState={{ selected: isSelected }}
            testID={testID ? `${testID}-${value}` : undefined}
            hitSlop={{ top: 8, bottom: 8 }}
            onPress={() => {
              haptics.selection();
              onChange(isSelected ? undefined : value);
            }}
            style={{
              width: SEGMENT_WIDTH,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: RADIUS.full,
              borderCurve: "continuous",
              backgroundColor: isSelected ? thumbColor : "transparent",
              boxShadow: isSelected
                ? "0 1px 3px rgba(0, 0, 0, 0.12)"
                : undefined,
            }}
          >
            <RatingIcon
              value={value}
              color={isSelected ? colors.text : colors.textSecondary}
            />
          </Pressable>
        );
      })}
    </View>
  );
};
