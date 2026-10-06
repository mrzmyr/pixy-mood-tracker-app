import { useEffect, useRef } from "react";
import { getSlideMarginTop } from "./marginTop";
import { t } from "@/lib/translation";
import useColors from "@/hooks/useColors";
import { useHealthSleep, useHealthSleepSetting } from "@/features/health";
import type { HealthSleep } from "@/features/health";
import { useAnalytics } from "@/state/analytics";
import { SLEEP_QUALITY_KEYS } from "@/constants/Ratings";
import { useLogDraft } from "../logDraft";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LinkButton from "@/components/LinkButton";
import { SlideHeadline } from "../components/SlideHeadline";
import { Footer } from "./Footer";
import { SlideSleepButton } from "./SlideSleepButton";

// Worst to best, so "Not at all" sits left and "Great" right.
const SLEEP_QUALITIES = [...SLEEP_QUALITY_KEYS].reverse();

/** "7h 20m asleep" line under the scale, with wake-ups when known. */
const formatHealthSummary = ({ night }: HealthSleep) => {
  const duration = t("health_sleep_duration", {
    hours: Math.floor(night.asleepMinutes / 60),
    minutes: night.asleepMinutes % 60,
  });
  return night.hasInterruptions
    ? t("health_sleep_summary_wake_ups", { duration, count: night.wakeUps })
    : t("health_sleep_summary", { duration });
};

/**
 * Sleep quality slide. Picking a quality calls `onSelect`; picking the
 * selected quality again clears it and stays on the slide.
 *
 * With `canFillFromHealth` and the Apple Health setting on, the slide
 * preselects the quality scored from last night once and shows the sleep
 * summary. Tapping the preselected quality confirms it and moves on.
 */
export const SlideSleep = ({
  onSelect,
  onDisableStep,
  showDisable,
  canFillFromHealth,
}: {
  onSelect: () => void;
  onDisableStep: () => void;
  showDisable: boolean;
  /** New entries only; edits keep the stored quality. */
  canFillFromHealth: boolean;
}) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const analytics = useAnalytics();
  const { draft, setSleepQuality, prefillSleepQuality } = useLogDraft();
  const selected = draft.sleep?.quality ?? null;
  const { isEnabled: isHealthEnabled } = useHealthSleepSetting();
  const health = useHealthSleep(
    draft.date,
    canFillFromHealth && isHealthEnabled
  );
  // Quality from Apple Health until the user confirms or changes it.
  const filled = useRef<HealthSleep["score"]["quality"] | null>(null);
  const hasFilled = useRef(false);

  useEffect(() => {
    if (health === null || hasFilled.current || selected !== null) {
      return;
    }
    hasFilled.current = true;
    filled.current = health.score.quality;
    prefillSleepQuality(health.score.quality);
    analytics.track("logger:health_sleep_filled", {
      quality: health.score.quality,
      has_bedtime: health.score.bedtime !== null,
      has_interruptions: health.score.interruptions !== null,
    });
  }, [health, selected, prefillSleepQuality, analytics]);

  const marginTop = getSlideMarginTop();

  return (
    <View
      style={{
        flex: 1,
        width: "100%",
        paddingHorizontal: 20,
        paddingBottom: insets.bottom + 20,
        marginTop,
      }}
    >
      <SlideHeadline>{t("log_sleep_question")}</SlideHeadline>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 32,
        }}
      >
        {SLEEP_QUALITIES.map((key) => (
          <SlideSleepButton
            key={key}
            value={key}
            selected={selected === key}
            onPress={() => {
              const from = filled.current;
              filled.current = null;
              if (from !== null && from !== key) {
                analytics.track("logger:health_sleep_changed", {
                  from,
                  to: key,
                });
              }
              if (from === key) {
                requestAnimationFrame(onSelect);
                return;
              }
              if (selected === key) {
                setSleepQuality(null);
                return;
              }
              setSleepQuality(key);
              // Moving the carousel in the same press as the draft update
              // leaves it on this slide. Advance on the next frame.
              requestAnimationFrame(onSelect);
            }}
          />
        ))}
      </View>
      <View
        style={{
          marginTop: 8,
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <Text
          style={{
            flex: 5,
            fontSize: 14,
            color: colors.textSecondary,
            textAlign: "center",
          }}
        >
          {t("logger_step_sleep_low")}
        </Text>
        <View style={{ flex: 15 }} />
        <Text
          style={{
            flex: 5,
            fontSize: 14,
            color: colors.textSecondary,
            textAlign: "center",
          }}
        >
          {t("logger_step_sleep_high")}
        </Text>
      </View>
      {health !== null && (
        <Text
          testID="health-sleep-summary"
          style={{
            marginTop: 24,
            fontSize: 14,
            color: colors.textSecondary,
            textAlign: "center",
          }}
        >
          {formatHealthSummary(health)}
        </Text>
      )}
      <View style={{ flex: 1 }} />
      <Footer>
        {showDisable && (
          <LinkButton
            type="secondary"
            onPress={onDisableStep}
            style={{
              fontWeight: "400",
            }}
          >
            {t("log_sleep_disable")}
          </LinkButton>
        )}
      </Footer>
    </View>
  );
};
