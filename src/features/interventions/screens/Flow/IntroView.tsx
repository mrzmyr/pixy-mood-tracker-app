import { Text, View } from "react-native";
import useColors from "@/hooks/useColors";
import { t, tDynamic } from "@/lib/translation";
import type { Intervention } from "../../catalog";
import { Duration } from "../../components/Duration";

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
        <Text
          accessibilityRole="header"
          style={{
            fontSize: 30,
            lineHeight: 36,
            letterSpacing: -0.5,
            fontWeight: "700",
            color: colors.text,
          }}
        >
          {t(`interventions_${id}_title`)}
        </Text>
        <Duration length={intervention.length} minutes={intervention.minutes} />
      </View>
      <Text style={{ fontSize: 17, lineHeight: 25, color: colors.text }}>
        {t(`interventions_${id}_lead`)}
      </Text>
      <View style={{ gap: 12 }}>
        {what.map((key, index) => (
          <View key={key} style={{ flexDirection: "row", gap: 12 }}>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: colors.logCardBackground,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{ fontSize: 13, fontWeight: "600", color: colors.text }}
              >
                {index + 1}
              </Text>
            </View>
            <Text
              style={{
                flex: 1,
                fontSize: 16,
                lineHeight: 23,
                color: colors.text,
              }}
            >
              {tDynamic(key)}
            </Text>
          </View>
        ))}
      </View>
      <Text
        style={{ fontSize: 15, lineHeight: 21, color: colors.textSecondary }}
      >
        {t(`interventions_${id}_science`)}
      </Text>
    </View>
  );
};
