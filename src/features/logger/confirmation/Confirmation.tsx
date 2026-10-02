import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLogState } from "@/features/logs";
import type { LogItem } from "@/features/logs";
import { getItemDate } from "@/lib/logDates";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import { t } from "@/lib/translation";
import type { ConfirmationAnswer } from "@/state/analytics/events";
import { getEncouragement } from "./encouragement";
import { ConfirmationHero } from "./ConfirmationHero";
import { createRise, getEaseOutCss, LAND_MS } from "./motion";
import { getWeekPixels } from "./weekPixels";
import { CONFIRMATION_ANSWERS, useConfirmation } from "./useConfirmation";

const ICONS: Record<ConfirmationAnswer, LucideIcon> = {
  worse: ArrowDownRight,
  same: ArrowRight,
  better: ArrowUpRight,
};

/** Pause on the picked answer so the user sees it before the logger closes. */
const CLOSE_DELAY_MS = 500;

/**
 * Last logger step after a new entry: the entry's pixel in its week and a
 * warm message at the top, "How are you feeling now?" with three answers at
 * the bottom. Only the top part animates in; answers are there at once and
 * only give press feedback.
 *
 * Calls `onClose` after an answer or skip.
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
  const pixels = getWeekPixels({
    items: logState.items,
    date: getItemDate(item),
  });
  // The message describes the day's pixel, which averages all its entries.
  const encouragement = getEncouragement(pixels.at(-1)?.rating ?? item.rating);
  const { answer, skip } = useConfirmation({
    item,
    entriesCount,
  });
  const [selected, setSelected] = useState<ConfirmationAnswer | null>(null);
  const isReducedMotion = useReducedMotion();
  const pressEasing = useMemo(() => getEaseOutCss(), []);
  const titleEntering = useMemo(
    () => createRise({ delay: 300, isReducedMotion }),
    [isReducedMotion]
  );
  const bodyEntering = useMemo(
    () => createRise({ delay: 360, isReducedMotion }),
    [isReducedMotion]
  );

  // Success haptic on the same frame the pixel lands, not before it.
  useEffect(() => {
    const timeout = setTimeout(
      () => {
        void haptics.success();
      },
      isReducedMotion ? 0 : LAND_MS
    );
    return () => clearTimeout(timeout);
  }, [haptics, isReducedMotion]);

  useEffect(() => {
    if (selected === null) {
      return;
    }

    const timeout = setTimeout(onClose, CLOSE_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [selected, onClose]);

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
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 12,
        }}
      >
        <ConfirmationHero pixels={pixels} />
        <Animated.Text
          entering={titleEntering}
          style={{
            marginTop: 28,
            fontSize: 26,
            lineHeight: 31,
            letterSpacing: -0.4,
            fontWeight: "600",
            color: colors.text,
            textAlign: "center",
          }}
        >
          {encouragement.title}
        </Animated.Text>
        <Animated.Text
          entering={bodyEntering}
          style={{
            marginTop: 10,
            fontSize: 17,
            lineHeight: 25,
            color: colors.textSecondary,
            textAlign: "center",
          }}
        >
          {encouragement.body}
        </Animated.Text>
      </View>

      <Text
        style={{
          fontSize: 17,
          fontWeight: "600",
          color: colors.text,
          textAlign: "center",
          marginBottom: 14,
        }}
      >
        {t("log_confirmation_question")}
      </Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {CONFIRMATION_ANSWERS.map((value) => {
          const Icon = ICONS[value];
          const isSelected = selected === value;
          const label = t(`log_confirmation_${value}`);
          const foreground = isSelected
            ? colors.logCardBackground
            : colors.text;

          return (
            <Pressable
              key={value}
              testID={`confirmation-${value}`}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected: isSelected }}
              disabled={selected !== null}
              pressRetentionOffset={16}
              onPress={() => {
                void haptics.selection();
                answer(value);
                setSelected(value);
              }}
              style={{ flex: 1 }}
            >
              {({ pressed }) => (
                <Animated.View
                  style={{
                    height: 104,
                    borderRadius: 20,
                    backgroundColor: isSelected
                      ? colors.text
                      : colors.logCardBackground,
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    shadowColor: "#000",
                    shadowOpacity: 0.06,
                    shadowRadius: 12,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 1,
                    // Press feedback only: 0.97 scale in 120 ms. Reduced
                    // motion dims instead of scaling.
                    transform: [
                      { scale: pressed && !isReducedMotion ? 0.97 : 1 },
                    ],
                    opacity: pressed && isReducedMotion ? 0.7 : 1,
                    transitionProperty: [
                      "transform",
                      "opacity",
                      "backgroundColor",
                    ],
                    transitionDuration: [120, 120, 150],
                    transitionTimingFunction: pressEasing,
                  }}
                >
                  <Icon color={foreground} size={28} strokeWidth={1.75} />
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "500",
                      color: foreground,
                    }}
                  >
                    {label}
                  </Text>
                </Animated.View>
              )}
            </Pressable>
          );
        })}
      </View>

      <Pressable
        testID="confirmation-skip"
        accessibilityRole="button"
        hitSlop={8}
        disabled={selected !== null}
        onPress={() => {
          skip();
          onClose();
        }}
        style={{ alignSelf: "center", marginTop: 8, padding: 12 }}
      >
        <Text style={{ fontSize: 15, color: colors.textSecondary }}>
          {t("log_confirmation_skip")}
        </Text>
      </Pressable>
    </View>
  );
};
