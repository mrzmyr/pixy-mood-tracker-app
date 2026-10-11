import chroma, { contrast, mix } from "chroma-js";
import { useEffect, useMemo } from "react";
import { Platform, Pressable, Text, useColorScheme, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused } from "expo-router";
import Button from "@/components/Button";
import tailwind from "@/constants/Colors/TailwindColors";
import { ConfirmationOffer } from "@/features/interventions";
import { useLogState } from "@/features/logs";
import type { LogItem } from "@/features/logs";
import { TagComponent, useTagsState } from "@/features/tags";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import { t } from "@/lib/translation";
import { useSettings } from "@/state/settings";
import { EMOTIONS } from "../config";
import {
  getDaySummary,
  getSummarySentence,
  getSummaryTitle,
  SUMMARY_TAGS_MAX,
} from "./daySummary";
import type { SummarySegment } from "./daySummary";
import {
  createConfettiBurst,
  createFadeIn,
  createHappyJump,
  createJump,
  HAPPY_LAND_MS,
  LAND_MS,
} from "./motion";
import { Pixy } from "./Pixy";
import { useConfirmation } from "./useConfirmation";
import { usePixyJumps } from "./usePixyJumps";

const emotionLabel = (key: string) =>
  EMOTIONS.find((emotion) => emotion.key === key)?.label ?? key;

/** WCAG AA contrast for normal text. */
const MIN_CONTRAST = 4.5;

/** `color`, brightened until it reads on `background`. */
const readableOn = (color: string, background: string) => {
  let readable = chroma(color);
  for (
    let step = 0;
    step < 8 && contrast(readable, background) < MIN_CONTRAST;
    step += 1
  ) {
    readable = readable.brighten(0.5);
  }
  return readable.hex();
};

const PIXY_SIZE = 56;
const CONFETTI_SIZE = 7;
const CONFETTI_COUNT = 12;

/**
 * Confetti pixels around Pixy: even angles, alternating distance, biased
 * upward so the burst reads as a cheer.
 */
const CONFETTI = Array.from({ length: CONFETTI_COUNT }, (_, index) => {
  const angle = (index / CONFETTI_COUNT) * Math.PI * 2;
  const distance = index % 2 === 0 ? 62 : 44;
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance * 0.8 - 18,
    rotate: (index % 3) * 120 + 90,
  };
});

interface MarkColors {
  background: string;
  text: string;
}

/**
 * Last logger step after a new entry: Pixy and a summary of the whole day
 * (mood, emotions, tags) as one sentence, then Done.
 *
 * Good days celebrate. Hard days comfort: Pixy closes its eyes and smiles,
 * and the sentence never repeats the rating back.
 *
 * Calls `onClose` on Done.
 */
export const Confirmation = ({
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
  const logState = useLogState();
  const { tags } = useTagsState();
  const { settings } = useSettings();
  const isReducedMotion = useReducedMotion();
  const isDark = useColorScheme() === "dark";
  useConfirmation({ item, entriesCount });

  const summary = useMemo(
    () => getDaySummary({ items: logState.items, item }),
    [logState.items, item]
  );
  // Pixy idles only while the logger is on screen.
  const isFocused = useIsFocused();
  const segments = getSummarySentence({ summary, emotionLabel });
  const dayTags =
    summary.tagIds.length <= SUMMARY_TAGS_MAX
      ? summary.tagIds.flatMap((id) => tags.filter((tag) => tag.id === id))
      : [];

  const scaleColor =
    colors.scales[settings.scaleType][summary.rating].background;
  const darkMark = (color: string, amount: number): MarkColors => {
    const background = mix(colors.logBackground, color, amount, "rgb").hex();
    return { background, text: readableOn(color, background) };
  };
  // Hard days: emotions get a neutral tint. Naming feelings is good;
  // coloring them as bad is not.
  const isNeutralEmotion = summary.tone === "bad";
  // Dark mode: light scale colors behind white text do not read. Use a deep
  // tint of the scale color and color the text instead.
  const marks: Record<NonNullable<SummarySegment["mark"]>, MarkColors> = isDark
    ? {
        mood: darkMark(scaleColor, 0.16),
        emotion: isNeutralEmotion
          ? { background: tailwind.neutral[800], text: colors.text }
          : darkMark(scaleColor, 0.1),
      }
    : {
        mood: {
          background: chroma(scaleColor).alpha(0.7).css(),
          text: colors.text,
        },
        emotion: {
          background: isNeutralEmotion
            ? chroma(colors.textSecondary).alpha(0.16).css()
            : chroma(scaleColor).alpha(0.35).css(),
          text: colors.text,
        },
      };

  const jump = useMemo(
    () => createJump({ isReducedMotion }),
    [isReducedMotion]
  );
  const happyJump = useMemo(
    () => createHappyJump({ isReducedMotion }),
    [isReducedMotion]
  );
  // Hard days: Pixy still jumps on tap, but keeps its caring face and skips
  // the confetti. Celebrate only good and neutral days.
  const { jumps, isJoyful, hasConfetti, tap } = usePixyJumps({
    isCelebrating: summary.tone !== "bad",
    isReducedMotion,
  });
  const confettiColors = [scaleColor, "#FFC23D", "#FB6B0F", "#ff8fa3"];
  const confetti = useMemo(
    () => CONFETTI.map((pixel) => createConfettiBurst(pixel)),
    []
  );
  // Title, sentence, and tags fade in one after the other.
  const titleEntering = useMemo(
    () => createFadeIn({ delay: 450, isReducedMotion }),
    [isReducedMotion]
  );
  const bodyEntering = useMemo(
    () => createFadeIn({ delay: 750, isReducedMotion }),
    [isReducedMotion]
  );
  const tagsEntering = useMemo(
    () => createFadeIn({ delay: 1050, isReducedMotion }),
    [isReducedMotion]
  );

  const landMs = jumps === 0 ? LAND_MS : HAPPY_LAND_MS;
  // Haptic on the frame Pixy lands: success after saving, a bump on replay.
  useEffect(() => {
    const timeout = setTimeout(
      () => {
        void (jumps === 0 ? haptics.success() : haptics.impact());
      },
      isReducedMotion ? 0 : landMs
    );
    return () => clearTimeout(timeout);
  }, [haptics, isReducedMotion, jumps, landMs]);

  return (
    <View
      testID="confirmation"
      style={{
        flex: 1,
        backgroundColor: colors.logBackground,
        // The iOS page sheet already sits below the status bar.
        paddingTop: 24 + (Platform.OS === "android" ? insets.top : 0),
        paddingBottom: insets.bottom + 8,
        paddingHorizontal: 20,
      }}
    >
      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable
            testID="confirmation-pixy"
            // Decorative: replaying the jump adds nothing for screen readers.
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            hitSlop={8}
            onPress={tap}
          >
            {hasConfetti && (
              <View
                key={`confetti-${jumps}`}
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: (PIXY_SIZE - CONFETTI_SIZE) / 2,
                  top: (PIXY_SIZE - CONFETTI_SIZE) / 2,
                }}
              >
                {confetti.map((burst, index) => (
                  <Animated.View
                    key={index}
                    entering={burst}
                    style={{
                      position: "absolute",
                      width: CONFETTI_SIZE,
                      height: CONFETTI_SIZE,
                      borderRadius: 2,
                      backgroundColor:
                        confettiColors[index % confettiColors.length],
                    }}
                  />
                ))}
              </View>
            )}
            <Animated.View
              key={`pixy-${jumps}`}
              entering={jumps === 0 ? jump : happyJump}
            >
              <Pixy
                size={PIXY_SIZE}
                tone={summary.tone}
                isJoyful={isJoyful}
                isIdle={isFocused}
              />
            </Animated.View>
          </Pressable>
          <Animated.View entering={titleEntering} style={{ flex: 1 }}>
            <Text
              accessibilityRole="header"
              style={{ fontSize: 17, fontWeight: "600", color: colors.text }}
            >
              {getSummaryTitle(summary)}
            </Text>
          </Animated.View>
        </View>
        <Animated.View entering={bodyEntering} style={{ marginTop: 22 }}>
          <Text
            testID="confirmation-summary"
            style={{
              fontSize: 24,
              lineHeight: 36,
              letterSpacing: -0.3,
              fontWeight: "600",
              color: colors.textSecondary,
            }}
          >
            {segments.map((segment) =>
              segment.mark ? (
                <Text
                  // Marked texts are unique: one mood, distinct emotions.
                  key={`${segment.mark}:${segment.text}`}
                  style={{
                    color: marks[segment.mark].text,
                    backgroundColor: marks[segment.mark].background,
                  }}
                >
                  {segment.text}
                </Text>
              ) : (
                segment.text
              )
            )}
          </Text>
        </Animated.View>
        {dayTags.length > 0 && (
          <Animated.View
            entering={tagsEntering}
            style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 20 }}
          >
            {dayTags.map((tag) => (
              <TagComponent
                key={tag.id}
                title={tag.title}
                colorName={tag.color}
                style={{ paddingHorizontal: 12, paddingVertical: 6 }}
              />
            ))}
          </Animated.View>
        )}
      </View>

      <ConfirmationOffer item={item} />
      <Button testID="confirmation-done" onPress={onClose}>
        {t("done")}
      </Button>
    </View>
  );
};
