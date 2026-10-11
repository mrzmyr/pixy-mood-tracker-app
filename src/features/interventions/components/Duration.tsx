import { Text, View } from "react-native";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import type { InterventionLength } from "@/state/analytics/events";

const BARS: Record<InterventionLength, number> = {
  quick: 1,
  medium: 2,
  long: 3,
};

/** Rising bars plus minutes, so length reads without numbers too. */
export const Duration = ({
  length,
  minutes,
}: {
  length: InterventionLength;
  minutes: number;
}) => {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View
        style={{ flexDirection: "row", alignItems: "flex-end", gap: 2 }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {[1, 2, 3].map((bar) => (
          <View
            key={bar}
            style={{
              width: 3,
              height: 4 + bar * 3,
              borderRadius: 1.5,
              backgroundColor:
                bar <= BARS[length] ? colors.tint : colors.stepperBackground,
            }}
          />
        ))}
      </View>
      <Text
        style={{
          fontSize: 13,
          color: colors.textSecondary,
          fontVariant: ["tabular-nums"],
        }}
      >
        {t("interventions_minutes", { count: minutes })}
      </Text>
    </View>
  );
};
