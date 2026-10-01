import { LinearGradient } from "expo-linear-gradient";
import {
  Check,
  FaceNeutral,
  FaceSlightlyFrowning,
  FaceSlightlySmiling,
  X,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  Keyframe,
  ZoomIn,
} from "react-native-reanimated";
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
  worse: FaceSlightlyFrowning,
  same: FaceNeutral,
  better: FaceSlightlySmiling,
};

// Mood color per answer, from the user's scale.
const ANSWER_RATINGS: Record<FeelingCheckAnswer, LogItem["rating"]> = {
  worse: "very_bad",
  same: "neutral",
  better: "very_good",
};

/** Pause on the picked answer so the user sees it before the screen closes. */
const CLOSE_DELAY_MS = 450;

const BADGE_SIZE = 104;
const BURST_DOTS = 10;
const BURST_RADIUS = 96;

const createBurst = (index: number) => {
  const angle = (index / BURST_DOTS) * Math.PI * 2;

  return new Keyframe({
    0: {
      opacity: 1,
      transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 0.4 }],
    },
    100: {
      opacity: 0,
      transform: [
        { translateX: Math.cos(angle) * BURST_RADIUS },
        { translateY: Math.sin(angle) * BURST_RADIUS },
        { scale: 1 },
      ],
    },
  })
    .delay(180)
    .duration(750);
};

/**
 * Full-screen confirmation after a new entry: a celebrating badge, a
 * supportive message for the rating, then "How are you feeling now?".
 *
 * Calls `onClose` after an answer or skip.
 */
export const FeelingCheckCelebrate = ({
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
      style={{ flex: 1, backgroundColor: colors.logBackground }}
    >
      <LinearGradient
        colors={[mood.background, colors.logBackground]}
        locations={[0, 0.75]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <View
        style={{
          flex: 1,
          // The iOS page sheet already sits below the status bar.
          paddingTop: 16 + (Platform.OS === "android" ? insets.top : 0),
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 20,
        }}
      >
        <View style={{ alignItems: "flex-end" }}>
          <Pressable
            testID="feeling-check-skip"
            accessibilityRole="button"
            accessibilityLabel={t("log_feeling_check_skip")}
            hitSlop={12}
            onPress={() => {
              skip();
              onClose();
            }}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "rgba(255,255,255,0.35)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X color={mood.text} size={20} />
          </Pressable>
        </View>

        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <View
            style={{
              width: BADGE_SIZE,
              height: BADGE_SIZE,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {Array.from({ length: BURST_DOTS }, (_, index) => (
              <Animated.View
                key={index}
                entering={createBurst(index)}
                style={{
                  position: "absolute",
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  opacity: 0,
                  backgroundColor: index % 2 === 0 ? mood.text : "#fff",
                }}
              />
            ))}
            <Animated.View
              entering={ZoomIn.springify().damping(11)}
              style={{
                width: BADGE_SIZE,
                height: BADGE_SIZE,
                borderRadius: BADGE_SIZE / 2,
                backgroundColor: "#fff",
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#000",
                shadowOpacity: 0.15,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 8 },
                elevation: 6,
              }}
            >
              <View
                style={{
                  width: BADGE_SIZE - 24,
                  height: BADGE_SIZE - 24,
                  borderRadius: (BADGE_SIZE - 24) / 2,
                  backgroundColor: mood.background,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Check color={mood.text} size={44} strokeWidth={3} />
              </View>
            </Animated.View>
          </View>
          <Animated.Text
            entering={FadeInDown.delay(200).duration(400)}
            style={{
              marginTop: 32,
              fontSize: 32,
              fontWeight: "800",
              color: colors.text,
              textAlign: "center",
            }}
          >
            {encouragement.title}
          </Animated.Text>
          <Animated.Text
            entering={FadeInDown.delay(300).duration(400)}
            style={{
              marginTop: 12,
              fontSize: 17,
              lineHeight: 24,
              color: colors.textSecondary,
              textAlign: "center",
              maxWidth: 320,
            }}
          >
            {encouragement.body}
          </Animated.Text>
        </View>

        <Animated.Text
          entering={FadeInUp.delay(400).duration(400)}
          style={{
            fontSize: 20,
            fontWeight: "700",
            color: colors.text,
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          {t("log_feeling_check_question")}
        </Animated.Text>
        <View style={{ flexDirection: "row", gap: 12 }}>
          {FEELING_CHECK_ANSWERS.map((value, index) => {
            const Icon = ICONS[value];
            const answerMood = scale.colors[ANSWER_RATINGS[value]];
            const isSelected = selected === value;
            const label = t(`log_feeling_check_${value}`);

            return (
              <Animated.View
                key={value}
                entering={FadeInUp.delay(450 + index * 80).duration(400)}
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
                    height: 128,
                    borderRadius: 24,
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    backgroundColor: isSelected
                      ? answerMood.background
                      : colors.logCardBackground,
                    transform: [{ scale: pressed || isSelected ? 0.96 : 1 }],
                    shadowColor: "#000",
                    shadowOpacity: 0.08,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 2,
                  })}
                >
                  <Icon
                    color={isSelected ? answerMood.text : colors.text}
                    size={40}
                    strokeWidth={2.25}
                  />
                  <Text
                    style={{
                      fontSize: 16,
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
      </View>
    </View>
  );
};
