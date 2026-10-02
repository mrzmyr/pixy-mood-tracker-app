import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { LogItem } from "@/features/logs";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import { t } from "@/lib/translation";
import type { FeelingCheckAnswer } from "@/state/analytics/events";
import { FeelingCheckHero } from "./FeelingCheckHero";
import { FEELING_CHECK_ANSWERS, useFeelingCheck } from "./useFeelingCheck";

const ICONS: Record<FeelingCheckAnswer, LucideIcon> = {
  worse: ArrowDownRight,
  same: ArrowRight,
  better: ArrowUpRight,
};

/** Pause on the picked answer so the user sees it before the logger closes. */
const CLOSE_DELAY_MS = 500;

/**
 * Last logger step after a new entry: a warm message for the rating at the
 * top, "How are you feeling now?" with three answers at the bottom.
 *
 * Calls `onClose` after an answer or skip.
 */
export const FeelingCheckCalm = ({
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
  const { encouragement, answer, skip } = useFeelingCheck({
    item,
    entriesCount,
  });
  const [selected, setSelected] = useState<FeelingCheckAnswer | null>(null);

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
    <Animated.View
      testID="feeling-check"
      entering={FadeIn.duration(300)}
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
        <FeelingCheckHero rating={item.rating} />
        <Animated.Text
          entering={FadeInDown.delay(250).duration(600)}
          style={{
            marginTop: 28,
            fontSize: 26,
            fontWeight: "600",
            color: colors.text,
            textAlign: "center",
          }}
        >
          {encouragement.title}
        </Animated.Text>
        <Animated.Text
          entering={FadeInDown.delay(400).duration(600)}
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

      <Animated.Text
        entering={FadeInDown.delay(600).duration(500)}
        style={{
          fontSize: 17,
          fontWeight: "600",
          color: colors.text,
          textAlign: "center",
          marginBottom: 14,
        }}
      >
        {t("log_feeling_check_question")}
      </Animated.Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {FEELING_CHECK_ANSWERS.map((value, index) => {
          const Icon = ICONS[value];
          const isSelected = selected === value;
          const label = t(`log_feeling_check_${value}`);
          const foreground = isSelected
            ? colors.logCardBackground
            : colors.text;

          return (
            <Animated.View
              key={value}
              entering={FadeInDown.delay(700 + index * 70)
                .springify()
                .damping(16)}
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
                  borderRadius: 20,
                  backgroundColor: isSelected
                    ? colors.text
                    : colors.logCardBackground,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                  shadowColor: "#000",
                  shadowOpacity: 0.06,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 1,
                })}
              >
                <Icon color={foreground} size={28} strokeWidth={1.75} />
                <Text
                  style={{ fontSize: 15, fontWeight: "500", color: foreground }}
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
        style={{ alignSelf: "center", marginTop: 8, padding: 12 }}
      >
        <Text style={{ fontSize: 15, color: colors.textSecondary }}>
          {t("log_feeling_check_skip")}
        </Text>
      </Pressable>
    </Animated.View>
  );
};
