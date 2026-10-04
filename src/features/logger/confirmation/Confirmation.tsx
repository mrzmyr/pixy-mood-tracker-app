import chroma from "chroma-js";
import { useEffect, useMemo } from "react";
import { Platform, Text, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "@/components/Button";
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
import { createFadeIn, createJump, LAND_MS } from "./motion";
import { Pixy } from "./Pixy";
import { useConfirmation } from "./useConfirmation";

const emotionLabel = (key: string) =>
  EMOTIONS.find((emotion) => emotion.key === key)?.label ?? key;

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
  const marks: Record<NonNullable<SummarySegment["mark"]>, string> = {
    mood: chroma(scaleColor).alpha(0.7).css(),
    // Hard days: emotions get a neutral tint. Naming feelings is good;
    // coloring them as bad is not.
    emotion:
      summary.tone === "bad"
        ? chroma(colors.textSecondary).alpha(0.16).css()
        : chroma(scaleColor).alpha(0.35).css(),
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

  // Success haptic on the frame Pixy lands.
  useEffect(() => {
    const timeout = setTimeout(
      () => {
        void haptics.success();
      },
      isReducedMotion ? 0 : LAND_MS
    );
    return () => clearTimeout(timeout);
  }, [haptics, isReducedMotion]);

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
          <Animated.View entering={jump}>
            <Pixy size={56} tone={summary.tone} />
          </Animated.View>
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
                    color: colors.text,
                    backgroundColor: marks[segment.mark],
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
