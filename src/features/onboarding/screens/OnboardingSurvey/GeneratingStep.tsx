import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { Text, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { PixyMascot } from "@/components/Pixy/PixyMascot";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { useSettings } from "@/state/settings";
import { createRise } from "./motion";
import type { SurveyPlan } from "./plan";

/** Shortest time on this screen, so the checklist can be read. */
const MIN_MS = 3400;
const LINE_MS = 550;
const LINE_COUNT = 4;
const CELL_MS = 85;
const CELLS = Array.from({ length: 28 }, (_, index) => ({
  id: `cell-${index}`,
  // Mostly good days, fixed per cell.
  level: (
    [
      "extremely_good",
      "very_good",
      "very_good",
      "good",
      "good",
      "good",
      "neutral",
      "neutral",
      "bad",
      "very_bad",
    ] as const
  )[(index * 7 + 3) % 10],
}));

/**
 * "Setting up" screen. Runs `apply` while a mini calendar fills with
 * pixels and a checklist ticks off, then calls `onDone`. Stays at least
 * {@link MIN_MS}, even when applying is faster.
 */
export const GeneratingStep = ({
  plan,
  canNotify,
  apply,
  onDone,
}: {
  plan: SurveyPlan;
  canNotify: boolean;
  apply: () => Promise<void>;
  onDone: () => void;
}) => {
  const colors = useColors();
  const { settings } = useSettings();
  const isReducedMotion = useReducedMotion();
  const scale = colors.scales[settings.scaleType];
  const [filledCount, setFilledCount] = useState(0);
  const [doneLines, setDoneLines] = useState(0);
  const [celebrateKey, setCelebrateKey] = useState(0);

  const lines = [
    plan.reminderTime && canNotify
      ? t("onboarding_survey_generating_reminder")
      : t("onboarding_survey_generating_no_reminder"),
    t("onboarding_survey_generating_steps"),
    plan.tags.length > 0
      ? t("onboarding_survey_generating_tags", { count: plan.tags.length })
      : t("onboarding_survey_generating_default_tags"),
    t("onboarding_survey_generating_tips"),
  ];
  const rises = useMemo(
    () =>
      Array.from({ length: LINE_COUNT }, (_, index) =>
        createRise({ delay: index * LINE_MS, isReducedMotion })
      ),
    [isReducedMotion]
  );

  const run = useEffectEvent(async () => {
    const started = Date.now();
    await apply();
    return Math.max(MIN_MS - (Date.now() - started), 0);
  });
  const finish = useEffectEvent(onDone);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let cell = 1; cell <= CELLS.length; cell += 1) {
      timers.push(setTimeout(() => setFilledCount(cell), 150 + cell * CELL_MS));
    }
    for (let line = 1; line <= LINE_COUNT; line += 1) {
      timers.push(setTimeout(() => setDoneLines(line), line * LINE_MS));
    }
    timers.push(setTimeout(() => setCelebrateKey(1), 2500));

    let isCurrent = true;
    const done = async () => {
      const rest = await run();
      if (isCurrent) {
        timers.push(setTimeout(finish, rest));
      }
    };
    void done();

    return () => {
      isCurrent = false;
      for (const timer of timers) {
        clearTimeout(timer);
      }
    };
  }, []);

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 28,
        paddingBottom: 40,
      }}
    >
      <PixyMascot size={112} celebrateKey={celebrateKey} />
      <Text
        accessibilityRole="header"
        style={{
          marginTop: 18,
          fontSize: 22,
          fontWeight: "700",
          textAlign: "center",
          color: colors.onboardingTitle,
        }}
      >
        {t("onboarding_survey_generating_title")}
      </Text>
      <View
        style={{
          width: 7 * 22 + 6 * 5,
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 5,
          marginTop: 22,
          marginBottom: 18,
        }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {CELLS.map((cell, index) => (
          <View
            key={cell.id}
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              backgroundColor:
                index < filledCount
                  ? scale[cell.level].background
                  : colors.onboardingSurveyTrack,
            }}
          />
        ))}
      </View>
      <View style={{ gap: 9, alignSelf: "center" }}>
        {lines.map((line, index) => {
          const isDone = index < doneLines;
          return (
            <Animated.View
              key={line}
              entering={rises[index]}
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  borderWidth: 2,
                  alignItems: "center",
                  justifyContent: "center",
                  borderColor: isDone
                    ? colors.onboardingSurveyAccent
                    : colors.onboardingSurveyTrack,
                  backgroundColor: isDone
                    ? colors.onboardingSurveyAccent
                    : "transparent",
                }}
              >
                {isDone ? (
                  <Text
                    style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}
                  >
                    ✓
                  </Text>
                ) : null}
              </View>
              <Text
                style={{
                  fontSize: 15,
                  color: isDone
                    ? colors.onboardingTitle
                    : colors.onboardingSurveyHint,
                }}
              >
                {line}
              </Text>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
};
