import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Heart,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import { t } from "@/lib/translation";
import type { InterventionFeedback } from "@/state/analytics/events";

const ANSWERS: { value: InterventionFeedback; Icon: LucideIcon }[] = [
  { value: "worse", Icon: ArrowDownRight },
  { value: "same", Icon: ArrowRight },
  { value: "better", Icon: ArrowUpRight },
];

/** Same three answers as the logger confirmation, asked after a flow. */
export const EndCheckView = ({
  selected,
  onAnswer,
  onSkip,
}: {
  selected: InterventionFeedback | null;
  onAnswer: (answer: InterventionFeedback) => void;
  onSkip: () => void;
}) => {
  const colors = useColors();
  const haptics = useHaptics();

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          paddingHorizontal: 12,
        }}
      >
        <Heart size={40} color={colors.tint} strokeWidth={1.75} />
        <Text
          accessibilityRole="header"
          style={{
            fontSize: 26,
            fontWeight: "600",
            color: colors.text,
            textAlign: "center",
          }}
        >
          {t("interventions_done_title")}
        </Text>
        <Text
          style={{
            fontSize: 17,
            lineHeight: 25,
            color: colors.textSecondary,
            textAlign: "center",
          }}
        >
          {t("interventions_done_body")}
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {ANSWERS.map(({ value, Icon }) => {
          const isSelected = selected === value;
          const foreground = isSelected
            ? colors.logCardBackground
            : colors.text;
          const label = t(`interventions_feedback_${value}`);
          return (
            <Pressable
              key={value}
              testID={`intervention-feedback-${value}`}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected: isSelected }}
              disabled={selected !== null}
              onPress={() => {
                void haptics.selection();
                onAnswer(value);
              }}
              style={({ pressed }) => ({
                flex: 1,
                height: 96,
                borderRadius: 20,
                backgroundColor: isSelected
                  ? colors.text
                  : colors.logCardBackground,
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Icon color={foreground} size={26} strokeWidth={1.75} />
              <Text
                style={{ fontSize: 15, fontWeight: "500", color: foreground }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        testID="intervention-feedback-skip"
        accessibilityRole="button"
        hitSlop={8}
        disabled={selected !== null}
        onPress={onSkip}
        style={{ alignSelf: "center", marginTop: 8, padding: 12 }}
      >
        <Text style={{ fontSize: 15, color: colors.textSecondary }}>
          {t("interventions_feedback_skip")}
        </Text>
      </Pressable>
    </View>
  );
};
