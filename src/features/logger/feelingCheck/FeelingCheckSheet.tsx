import chroma from "chroma-js";
import { Check, Cloud, CloudRain, Sun } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInUp, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { LogItem } from "@/features/logs";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import useScale from "@/hooks/useScale";
import { t } from "@/lib/translation";
import type { FeelingCheckAnswer } from "@/state/analytics/events";
import { useSettings } from "@/state/settings";
import { FEELING_CHECK_ANSWERS, useFeelingCheck } from "./useFeelingCheck";

const ICONS: Record<FeelingCheckAnswer, LucideIcon> = {
  worse: CloudRain,
  same: Cloud,
  better: Sun,
};

// Mood color per answer, from the user's scale.
const ANSWER_RATINGS: Record<FeelingCheckAnswer, LogItem["rating"]> = {
  worse: "very_bad",
  same: "neutral",
  better: "very_good",
};

/** Pause on the picked answer so the user sees it before the sheet closes. */
const CLOSE_DELAY_MS = 400;

/**
 * Sheet over the calendar after a new entry: a saved card with a supportive
 * message for the rating, then "How are you feeling now?".
 *
 * Calls `onClose` after an answer or skip. Swiping the sheet down counts as
 * skip.
 */
export const FeelingCheckSheet = ({
  item,
  entriesCount,
  onClose,
}: {
  item: LogItem;
  entriesCount: number;
  onClose: () => void;
}) => {
  const colors = useColors();
  const haptics = useHaptics();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const scale = useScale(settings.scaleType);
  const { encouragement, answer, skip } = useFeelingCheck({
    item,
    entriesCount,
  });
  const [selected, setSelected] = useState<FeelingCheckAnswer | null>(null);

  const mood = scale.colors[item.rating];

  useEffect(() => {
    void haptics.success();
  }, [haptics]);

  useEffect(() => {
    if (selected === null) {
      return;
    }

    const timeout = setTimeout(onClose, CLOSE_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [selected, onClose]);

  return (
    <View
      testID="feeling-check"
      style={{
        backgroundColor: colors.logCardBackground,
        paddingTop: 28,
        paddingHorizontal: 20,
        paddingBottom: insets.bottom + 8,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Animated.View
          entering={ZoomIn.springify().damping(12)}
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            backgroundColor: mood.background,
            alignItems: "center",
            justifyContent: "center",
            transform: [{ rotate: "-6deg" }],
          }}
        >
          <Check color={mood.text} size={28} strokeWidth={3} />
        </Animated.View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: "700", color: colors.text }}>
            {encouragement.title}
          </Text>
          <Text
            style={{
              marginTop: 2,
              fontSize: 15,
              lineHeight: 20,
              color: colors.textSecondary,
            }}
          >
            {encouragement.body}
          </Text>
        </View>
      </View>

      <Text
        style={{
          marginTop: 28,
          marginBottom: 12,
          fontSize: 17,
          fontWeight: "700",
          color: colors.text,
        }}
      >
        {t("log_feeling_check_question")}
      </Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {FEELING_CHECK_ANSWERS.map((value, index) => {
          const Icon = ICONS[value];
          const answerMood = scale.colors[ANSWER_RATINGS[value]];
          const isSelected = selected === value;
          const label = t(`log_feeling_check_${value}`);
          const tint = chroma(answerMood.background).alpha(0.28).css();

          return (
            <Animated.View
              key={value}
              entering={FadeInUp.delay(150 + index * 70).springify()}
              style={{ flex: 1 }}
            >
              <Pressable
                testID={`feeling-check-${value}`}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={{ selected: isSelected }}
                disabled={selected !== null}
                onPress={() => {
                  void haptics.selection();
                  answer(value);
                  setSelected(value);
                }}
                style={({ pressed }) => ({
                  height: 104,
                  borderRadius: 22,
                  backgroundColor: isSelected ? answerMood.background : tint,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transform: [
                    { scale: pressed ? 0.94 : 1 },
                    { rotate: isSelected ? "-3deg" : "0deg" },
                  ],
                })}
              >
                <Icon
                  color={isSelected ? answerMood.text : colors.text}
                  size={34}
                  strokeWidth={2}
                />
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "700",
                    color: isSelected ? answerMood.text : colors.text,
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>

      <Pressable
        testID="feeling-check-skip"
        accessibilityRole="button"
        hitSlop={8}
        disabled={selected !== null}
        onPress={() => {
          skip();
          onClose();
        }}
        style={{ alignSelf: "center", marginTop: 14, padding: 10 }}
      >
        <Text style={{ fontSize: 15, color: colors.textSecondary }}>
          {t("log_feeling_check_skip")}
        </Text>
      </Pressable>
    </View>
  );
};
