import { View } from "react-native";
import { Copy, Heading, Label } from "@/components/typography";
import useColors from "@/hooks/use-colors";
import { t, tDynamic } from "@/lib/translation";
import type { InterventionId, PromptStep } from "../../catalog";
import { RADIUS } from "@/constants/radius";

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
      <Label size={14} style={{ color: colors.textSecondary }}>
        {t("interventions_step_progress", { current: index + 1, total: count })}
      </Label>
      <Heading
        size={24}
        accessibilityRole="header"
        style={{
          lineHeight: 31,
          letterSpacing: -0.4,
          color: colors.text,
        }}
      >
        {tDynamic(`${prefix}_title`)}
      </Heading>
      <Copy size={16} style={{ lineHeight: 25, color: colors.text }}>
        {tDynamic(`${prefix}_body`)}
      </Copy>
      <View
        style={{
          backgroundColor: colors.logCardBackground,
          borderRadius: RADIUS.md,
          borderCurve: "continuous",
          padding: 14,
          gap: 4,
        }}
      >
        <Label size={13} strong style={{ color: colors.textSecondary }}>
          {t("interventions_for_example")}
        </Label>
        <Copy size={14} style={{ lineHeight: 21, color: colors.text }}>
          {tDynamic(`${prefix}_example`)}
        </Copy>
      </View>
      <Copy size={14} style={{ color: colors.textSecondary }}>
        {t("interventions_prompt_hint")}
      </Copy>
    </View>
  );
};
