import Check from "lucide-react-native/icons/check";
import Contrast from "lucide-react-native/icons/contrast";
import X from "lucide-react-native/icons/x";
import { Pressable, View } from "react-native";
import useColors from "@/hooks/use-colors";
import useHaptics from "@/hooks/use-haptics";
import { t } from "@/lib/translation";
import { RADIUS } from "@/constants/radius";
import { RATING_LABELS, RATING_ORDER } from "./need-rating-types";
import type { NeedRatingProps } from "./need-rating-types";

const ICONS = { met: Check, partly: Contrast, unmet: X };

/** Need rating outside iOS and Android: three icon buttons, one selected. */
export const NeedRating = ({
  label,
  state,
  onChange,
  testID,
}: NeedRatingProps) => {
  const colors = useColors();
  const haptics = useHaptics();

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      testID={testID}
      style={{ flexDirection: "row", gap: 4 }}
    >
      {RATING_ORDER.map((value) => {
        const Icon = ICONS[value];
        const isSelected = state === value;
        return (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityLabel={t(RATING_LABELS[value])}
            accessibilityState={{ selected: isSelected }}
            testID={testID ? `${testID}-${value}` : undefined}
            onPress={() => {
              haptics.selection();
              onChange(value);
            }}
            style={{
              width: 44,
              height: 32,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: RADIUS.sm,
              backgroundColor: isSelected ? colors.tint : "transparent",
            }}
          >
            <Icon
              size={16}
              color={isSelected ? "#fff" : colors.textSecondary}
            />
          </Pressable>
        );
      })}
    </View>
  );
};
