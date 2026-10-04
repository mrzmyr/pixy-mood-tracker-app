import dayjs from "dayjs";
import { useRouter } from "expo-router";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { BackHandler, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNotification } from "@/features/notifications";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { DEVICE_REQUIRES_CONSENT } from "@/state/analytics/consent";
import { useSettings } from "@/state/settings";
import { PrivacySlide } from "../Onboarding/PrivacySlide";
import { GeneratingStep } from "./GeneratingStep";
import { ADVANCE_MS, createStepEnter } from "./motion";
import { buildPlan } from "./plan";
import { PlanStep } from "./PlanStep";
import { QuestionStep } from "./QuestionStep";
import { SURVEY_QUESTIONS } from "./survey";
import type { SurveyAnswers, SurveyQuestionId } from "./survey";
import { useApplyPlan } from "./useApplyPlan";
import { WelcomeStep } from "./WelcomeStep";

// Step order: welcome, one step per question, privacy, generating, plan.
const WELCOME = 0;
const FIRST_QUESTION = 1;
const PRIVACY = FIRST_QUESTION + SURVEY_QUESTIONS.length;
const GENERATING = PRIVACY + 1;
const PLAN = GENERATING + 1;

const getSelected = (
  answers: SurveyAnswers,
  id: SurveyQuestionId
): string[] => {
  const value = answers[id];
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? [...value] : [value];
};

/**
 * Onboarding as a short survey. Pixy asks six questions, then the answers
 * set up the app (reminder, check-in steps, tags) and pick feature tips.
 * Privacy comes before anything is applied or the answers are sent, so
 * consent regions decide first. Finishing opens the logger for the first
 * entry.
 *
 * Behind the `onboarding-survey` feature flag.
 */
export const OnboardingSurvey = ({
  needsConsent = DEVICE_REQUIRES_CONSENT,
}: {
  needsConsent?: boolean;
} = {}) => {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const analytics = useAnalytics();
  const notifications = useNotification();
  const { addActionDone } = useSettings();
  const applyPlan = useApplyPlan();
  const isReducedMotion = useReducedMotion();

  const [step, setStep] = useState(WELCOME);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [canNotify, setCanNotify] = useState(false);
  const [celebrateKey, setCelebrateKey] = useState(0);
  const [reaction, setReaction] = useState<string | null>(null);
  // Blocks taps while Pixy hops and the next question is on its way.
  const isAdvancing = useRef(false);

  const question =
    step >= FIRST_QUESTION && step < PRIVACY
      ? SURVEY_QUESTIONS[step - FIRST_QUESTION]
      : null;
  const plan = useMemo(() => buildPlan(answers), [answers]);
  const enter = useMemo(
    () => createStepEnter({ direction, isReducedMotion }),
    [direction, isReducedMotion]
  );

  const goTo = (next: number) => {
    isAdvancing.current = false;
    setReaction(null);
    setDirection(next >= step ? 1 : -1);
    setStep(next);
  };

  const advanceLater = (ms: number) => {
    isAdvancing.current = true;
    setTimeout(() => goTo(step + 1), ms);
  };

  useEffect(() => {
    if (question) {
      analytics.track("onboarding:survey_question_viewed", {
        question: question.id,
        index: step - FIRST_QUESTION,
      });
    }
  }, [question, step, analytics]);

  const goBack = () => {
    if (step === WELCOME || step >= GENERATING || isAdvancing.current) {
      return;
    }
    goTo(step - 1);
  };

  const onHardwareBack = useEffectEvent(() => {
    goBack();
    return true;
  });

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onHardwareBack
    );
    return () => subscription.remove();
  }, []);

  const celebrate = (reactionKey: string | null) => {
    setCelebrateKey((key) => key + 1);
    setReaction(reactionKey ? t(reactionKey) : null);
    void haptics.selection();
  };

  const onPick = async (value: string) => {
    if (!question || isAdvancing.current) {
      return;
    }
    setAnswers((current) => ({ ...current, [question.id]: value }));
    celebrate(`onboarding_survey_react_${question.id}_${value}`);

    // Ask for notifications right when the user picks a time, where the
    // reason is obvious.
    if (question.id === "reminder" && value !== "none") {
      isAdvancing.current = true;
      const isGranted =
        (await notifications.hasPermission()) ||
        (await notifications.askForPermission());
      setCanNotify(isGranted);
    }
    advanceLater(ADVANCE_MS);
  };

  const onToggle = (value: string) => {
    if (!question || isAdvancing.current) {
      return;
    }
    const selected = getSelected(answers, question.id);
    const isAdding = !selected.includes(value);
    setAnswers((current) => ({
      ...current,
      [question.id]: isAdding
        ? [...selected, value]
        : selected.filter((item) => item !== value),
    }));
    if (isAdding) {
      setCelebrateKey((key) => key + 1);
    }
    void haptics.selection();
  };

  const onContinue = () => {
    if (!question || isAdvancing.current) {
      return;
    }
    celebrate(`onboarding_survey_react_${question.id}`);
    advanceLater(ADVANCE_MS);
  };

  const onSkip = () => {
    if (!question || isAdvancing.current) {
      return;
    }
    setAnswers((current) => ({ ...current, [question.id]: undefined }));
    goTo(step + 1);
  };

  // Sent once privacy is done, from an effect: the consent choice must be in
  // settings before anything is tracked.
  const trackCompleted = useEffectEvent(() => {
    analytics.track("onboarding:survey_completed", {
      experience: answers.experience ?? null,
      goals: answers.goals ?? [],
      frequency: answers.frequency ?? null,
      reminder: answers.reminder ?? null,
      depth: answers.depth ?? null,
      influences: answers.influences ?? [],
      skipped_count: SURVEY_QUESTIONS.filter((q) => answers[q.id] === undefined)
        .length,
      notifications_granted: canNotify,
    });
  });

  useEffect(() => {
    if (step === GENERATING) {
      trackCompleted();
    }
  }, [step]);

  const onGenerated = () => {
    analytics.track("onboarding:plan_viewed", { tips: plan.tips });
    goTo(PLAN);
  };

  const finish = () => {
    addActionDone("onboarding");
    analytics.track("onboarding:flow_completed");
    analytics.track("onboarding:first_entry_opened");
    router.replace("/calendar");
    router.push({
      pathname: "/logs/create/[dateTime]",
      params: { dateTime: dayjs().toISOString() },
    });
  };

  const renderStep = () => {
    if (step === WELCOME) {
      return <WelcomeStep onStart={() => goTo(FIRST_QUESTION)} />;
    }
    if (question) {
      return (
        <QuestionStep
          question={question}
          selected={getSelected(answers, question.id)}
          reaction={reaction}
          celebrateKey={celebrateKey}
          onPick={onPick}
          onToggle={onToggle}
          onContinue={onContinue}
          onSkip={onSkip}
          onBack={goBack}
        />
      );
    }
    if (step === PRIVACY) {
      return (
        <PrivacySlide
          onPress={() => goTo(GENERATING)}
          needsConsent={needsConsent}
        />
      );
    }
    if (step === GENERATING) {
      return (
        <GeneratingStep
          plan={plan}
          canNotify={canNotify}
          apply={() => applyPlan(plan, { canNotify })}
          onDone={onGenerated}
        />
      );
    }
    return <PlanStep plan={plan} canNotify={canNotify} onFinish={finish} />;
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.onboardingBottomBackground,
        paddingTop: step === PRIVACY ? 0 : insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <Animated.View key={step} entering={enter} style={{ flex: 1 }}>
        {renderStep()}
      </Animated.View>
    </View>
  );
};
