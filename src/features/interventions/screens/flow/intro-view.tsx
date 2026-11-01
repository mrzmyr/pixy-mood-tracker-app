import { View } from "react-native";
import { Copy, Heading, Label } from "@/components/typography";
import useColors from "@/hooks/use-colors";
import { t, tDynamic } from "@/lib/translation";
import type { Intervention } from "../../catalog";
import { Duration } from "../../components/duration";
import { RADIUS } from "@/constants/radius";

/** What the exercise is, its steps, and why it helps. */
export const IntroView = ({ intervention }: { intervention: Intervention }) => {
  const colors = useColors();
  const { id } = intervention;
  const what = Array.from(
    { length: intervention.whatCount },
    (_, index) => `interventions_${id}_what_${index + 1}`
  );

  return (
    <View style={{ gap: 18 }}>
      <View style={{ gap: 8 }}>
        <Heading
          size={32}
          accessibilityRole="header"
          style={{
            lineHeight: 36,
            letterSpacing: -0.5,
            fontWeight: "700",
            color: colors.text,
          }}
        >
          {t(`interventions_${id}_title`)}
        </Heading>
        <Duration length={intervention.length} minutes={intervention.minutes} />
      </View>
      <Copy size={16} style={{ lineHeight: 25, color: colors.text }}>
        {t(`interventions_${id}_lead`)}
      </Copy>
      <View style={{ gap: 12 }}>
        {what.map((key, index) => (
          <View key={key} style={{ flexDirection: "row", gap: 12 }}>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: RADIUS.full,
                backgroundColor: colors.logCardBackground,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Label size={13} strong style={{ color: colors.text }}>
                {index + 1}
              </Label>
            </View>
            <Copy
              size={16}
              style={{
                flex: 1,
                lineHeight: 23,
                color: colors.text,
              }}
            >
              {tDynamic(key)}
            </Copy>
          </View>
        ))}
      </View>
      <Copy size={14} style={{ lineHeight: 21, color: colors.textSecondary }}>
        {t(`interventions_${id}_science`)}
      </Copy>
    </View>
  );
};
