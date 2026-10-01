import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
} from "lucide-react-native";
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
import { FEELING_CHECK_ANSWERS, useFeelingCheck } from "./useFeelingCheck";

const ICONS: Record<FeelingCheckAnswer, LucideIcon> = {
  worse: ArrowDownRight,
  same: ArrowRight,
  better: ArrowUpRight,
};

/** Pause on the picked answer so the user sees it before the logger closes. */
const CLOSE_DELAY_MS = 450;

/**
 * Last logger step after a new entry: a quiet confirmation, a supportive
 * message for the rating, then "How are you feeling now?".
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
      entering={FadeIn.duration(400)}
      style={{
        flex: 1,
        backgroundColor: colors.logBackground,
        // The iOS page sheet already sits below the status bar.
        paddingTop: 56 + (Platform.OS === "android" ? insets.top : 0),
        paddingBottom: insets.bottom + 16,
        paddingHorizontal: 24,
      }}
    >
      <View style={{ flex: 1 }}>
        <Animated.View
          entering={FadeInDown.delay(100).duration(500)}
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            borderWidth: 1.5,
            borderColor: colors.logCardBorder,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Check color={colors.text} size={22} strokeWidth={2} />
        </Animated.View>
        <Animated.Text
          entering={FadeInDown.delay(200).duration(500)}
          style={{
            marginTop: 24,
            fontSize: 28,
            fontWeight: "600",
            color: colors.text,
          }}
        >
          {encouragement.title}
        </Animated.Text>
        <Animated.Text
          entering={FadeInDown.delay(300).duration(500)}
          style={{
            marginTop: 10,
            fontSize: 17,
            lineHeight: 25,
            color: colors.textSecondary,
          }}
        >
          {encouragement.body}
        </Animated.Text>

        <Animated.View
          entering={FadeInDown.delay(450).duration(500)}
          style={{ marginTop: 48 }}
        >
          <View
            style={{
              height: 1,
              backgroundColor: colors.logCardBorder,
              marginBottom: 24,
            }}
          />
          <Text
            style={{
              fontSize: 17,
              fontWeight: "600",
              color: colors.text,
              marginBottom: 16,
            }}
          >
            {t("log_feeling_check_question")}
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {FEELING_CHECK_ANSWERS.map((value) => {
              const Icon = ICONS[value];
              const isSelected = selected === value;
              const label = t(`log_feeling_check_${value}`);
              const foreground = isSelected
                ? colors.logBackground
                : colors.text;

              return (
                <Pressable
                  key={value}
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
                    flex: 1,
                    height: 112,
                    borderRadius: 20,
                    borderWidth: 1.5,
                    borderColor: isSelected
                      ? colors.text
                      : colors.logCardBorder,
                    backgroundColor: isSelected ? colors.text : "transparent",
                    opacity: pressed ? 0.6 : 1,
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                  })}
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
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </View>

      <Pressable
        testID="feeling-check-skip"
        accessibilityRole="button"
        hitSlop={12}
        disabled={selected !== null}
        onPress={() => {
          skip();
          onClose();
        }}
        style={{ alignSelf: "center", padding: 12 }}
      >
        <Text style={{ fontSize: 15, color: colors.textSecondary }}>
          {t("log_feeling_check_skip")}
        </Text>
      </Pressable>
    </Animated.View>
  );
};
