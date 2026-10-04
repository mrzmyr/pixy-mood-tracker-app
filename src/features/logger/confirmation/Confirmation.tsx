import chroma, { contrast, mix } from "chroma-js";
import { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, Text, useColorScheme, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "@/components/Button";
import tailwind from "@/constants/Colors/TailwindColors";
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
import { createFadeIn, createJump, LAND_MS } from "./motion";
import { Pixy } from "./Pixy";
import { useConfirmation } from "./useConfirmation";

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
  // Each tap on Pixy remounts it, so the jump plays again.
  const [jumps, setJumps] = useState(0);
  useConfirmation({ item, entriesCount });

  const summary = useMemo(
    () => getDaySummary({ items: logState.items, item }),
    [logState.items, item]
  );
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

  // Haptic on the frame Pixy lands: success after saving, a bump on replay.
  useEffect(() => {
    const timeout = setTimeout(
      () => {
        void (jumps === 0 ? haptics.success() : haptics.impact());
      },
      isReducedMotion ? 0 : LAND_MS
    );
    return () => clearTimeout(timeout);
  }, [haptics, isReducedMotion, jumps]);

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
            onPress={() => {
              void haptics.selection();
              setJumps((count) => count + 1);
            }}
          >
            <Animated.View key={jumps} entering={jump}>
              <Pixy size={56} tone={summary.tone} />
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

      {/* Interventions will sit here, between the summary and Done. */}
      <Button testID="confirmation-done" onPress={onClose}>
        {t("done")}
      </Button>
    </View>
  );
};
