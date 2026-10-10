import { Text, View } from "react-native";
import useColors from "@/hooks/useColors";
import { t, tDynamic } from "@/lib/translation";
import type { InterventionId, PromptStep } from "../../catalog";
import { RADIUS } from "@/constants/Radius";

/** Thinking prompt with an example. Nothing is typed or saved. */
export const PromptView = ({
  id,
  step,
  index,
  count,
}: {
  id: InterventionId;
  step: PromptStep;
  index: number;
  count: number;
}) => {
  const colors = useColors();
  const prefix = `interventions_${id}_${step.key}`;

  return (
    <View style={{ gap: 14 }}>
      <Text style={{ fontSize: 14, color: colors.textSecondary }}>
        {t("interventions_step_progress", { current: index + 1, total: count })}
      </Text>
      <Text
        accessibilityRole="header"
        style={{
          fontSize: 26,
          lineHeight: 31,
          letterSpacing: -0.4,
          fontWeight: "600",
          color: colors.text,
        }}
      >
        {tDynamic(`${prefix}_title`)}
      </Text>
      <Text style={{ fontSize: 17, lineHeight: 25, color: colors.text }}>
        {tDynamic(`${prefix}_body`)}
      </Text>
      <View
        style={{
          backgroundColor: colors.logCardBackground,
          borderRadius: RADIUS.md,
          padding: 14,
          gap: 4,
        }}
      >
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: colors.textSecondary,
          }}
        >
          {t("interventions_for_example")}
        </Text>
        <Text style={{ fontSize: 15, lineHeight: 21, color: colors.text }}>
          {tDynamic(`${prefix}_example`)}
        </Text>
      </View>
      <Text style={{ fontSize: 14, color: colors.textSecondary }}>
        {t("interventions_prompt_hint")}
      </Text>
    </View>
  );
};
