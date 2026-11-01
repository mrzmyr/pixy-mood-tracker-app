import ArrowDownRight from "lucide-react-native/icons/arrow-down-right";
import ArrowRight from "lucide-react-native/icons/arrow-right";
import ArrowUpRight from "lucide-react-native/icons/arrow-up-right";
import Sparkles from "lucide-react-native/icons/sparkles";
import type { LucideIcon } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { Copy, Heading, Label } from "@/components/typography";
import useColors from "@/hooks/use-colors";
import useHaptics from "@/hooks/use-haptics";
import { t } from "@/lib/translation";
import type { InterventionFeedback } from "@/state/analytics/events";
import { RADIUS } from "@/constants/radius";

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
        <Sparkles size={40} color={colors.tint} strokeWidth={1.75} />
        <Heading
          size={24}
          accessibilityRole="header"
          style={{
            color: colors.text,
            textAlign: "center",
          }}
        >
          {t("interventions_done_title")}
        </Heading>
        <Copy
          size={16}
          style={{
            lineHeight: 25,
            color: colors.textSecondary,
            textAlign: "center",
          }}
        >
          {t("interventions_done_body")}
        </Copy>
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
                borderRadius: RADIUS.md,
                borderCurve: "continuous",
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
              <Label size={14} style={{ fontWeight: "500", color: foreground }}>
                {label}
              </Label>
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
        <Label size={14} style={{ color: colors.textSecondary }}>
          {t("interventions_feedback_skip")}
        </Label>
      </Pressable>
    </View>
  );
};
