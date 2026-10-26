import { useRouter } from "expo-router";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { BackHandler, StyleSheet, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useReducedMotion,
} from "react-native-reanimated";
import { queueCalendarIntro } from "@/features/calendar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useColors from "@/hooks/use-colors";
import { useAnalytics } from "@/state/analytics";
import { DEVICE_REQUIRES_CONSENT } from "@/state/analytics/consent";
import { useSettings } from "@/state/settings";
import { useFeatureFlag } from "@/state/feature-flags";
import { useLocationSetting } from "@/features/location";
import {
  MAX_TAG_CATEGORIES,
  useMaxTags,
  useTagsState,
  useTagsUpdater,
} from "@/features/tags";
import { EMPTY_PERSONALIZATION } from "@/constants/personalization";
import type {
  PersonalizationAnswers,
  PersonalizationGoal,
  PersonalizationStruggle,
} from "@/constants/personalization";
import { t, tDynamic } from "@/lib/translation";
import {
  buildTagSelection,
  CAPTURE_OPTIONS,
  getStepsForCapture,
  getSuggestions,
} from "../../personalization";
import type { CaptureOption } from "../../personalization";
import { CaptureSlide } from "./capture-slide";
import { GoalSlide } from "./goal-slide";
import { IndexSlide } from "./index-slide";
import { NameSlide } from "./name-slide";
import { OnboardingSky } from "./onboarding-sky";
import { PrivacySlide } from "./privacy-slide";
import { ReminderSlide } from "./reminder-slide";
import { StrugglesSlide } from "./struggles-slide";
import { SummarySlide } from "./summary-slide";

/** Slide order. Slides 1 to 6 show the header with one dot each. */
const SLIDE = {
  welcome: 0,
  name: 1,
  goal: 2,
  struggles: 3,
  capture: 4,
  summary: 5,
  reminder: 6,
  privacy: 7,
} as const;
const HEADER_SLIDE_COUNT = SLIDE.reminder;
const PRIVACY_SLIDE_INDEX = SLIDE.privacy;

// The old slide fades out while the clouds speed up, then the next one fades in.
const SLIDE_ENTERING = FadeIn.delay(250).duration(700);
const SLIDE_EXITING = FadeOut.duration(300);
/** Time for the last slide and the sky to fade into the calendar color. */
const OUTRO_MS = 450;

/**
 * Onboarding flow, shown on start until the `onboarding` action is done.
 * Every slide sits on one drifting sky that speeds up between slides.
 * Questions (name, goal, struggles, check-in steps) shape the check-in:
 * the summary shows the suggested tags, and leaving applies the answers.
 * Finishing or skipping records that action and returns to the root. In
 * consent regions, skipping jumps to the privacy slide first, so the user
 * always answers the analytics question.
 */
export const Onboarding = ({
  needsConsent = DEVICE_REQUIRES_CONSENT,
}: {
  needsConsent?: boolean;
} = {}) => {
  const router = useRouter();
  const { addActionDone, setSettings, settings } = useSettings();
  const tagsState = useTagsState();
  const tagsUpdater = useTagsUpdater();
  const maxTags = useMaxTags();
  const isPhotosEnabled = useFeatureFlag("photos");
  const hasPeople = useFeatureFlag("people");
  const location = useLocationSetting();
  const colors = useColors();
  const analytics = useAnalytics();
  const insets = useSafeAreaInsets();

  const [index, setIndex] = useState(0);
  const [name, setName] = useState(settings.profileName);
  const [answers, setAnswers] = useState<PersonalizationAnswers>(
    EMPTY_PERSONALIZATION
  );
  const captureOptions = CAPTURE_OPTIONS.filter(
    (option) =>
      (option !== "photos" || isPhotosEnabled) &&
      (option !== "people" || hasPeople)
  );
  const [capture, setCapture] = useState<Set<CaptureOption>>(
    () =>
      new Set(
        CAPTURE_OPTIONS.filter((option) => settings.steps.includes(option))
      )
  );
  const [isPlacesChosen, setIsPlacesChosen] = useState(location.isEnabled);
  const [removedTagKeys, setRemovedTagKeys] = useState<Set<string>>(
    () => new Set()
  );
  // Highest slide reached: answers count only once their slide was passed.
  const reached = useRef(0);
  const suggestions = useMemo(
    () =>
      getSuggestions({
        answers,
        tagSlots: maxTags - tagsState.tags.length,
        categorySlots: MAX_TAG_CATEGORIES - tagsState.categories.length,
      }),
    [answers, maxTags, tagsState.tags.length, tagsState.categories.length]
  );
  const [isLeaving, setIsLeaving] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isReducedMotion = useReducedMotion();

  useEffect(
    () => () => {
      if (leaveTimer.current) {
        clearTimeout(leaveTimer.current);
      }
    },
    []
  );

  const goToSlide = (nextIndex: number) => {
    setIndex(nextIndex);
    reached.current = Math.max(reached.current, nextIndex);
    analytics.track("onboarding:slide_viewed", { index: nextIndex });
  };

  const onHardwareBack = useEffectEvent(() => {
    if (index === 0) {
      return true;
    }

    goToSlide(index - 1);
    return true;
  });

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onHardwareBack
    );

    return () => subscription.remove();
  }, []);

  // The slide and the sky fade into the calendar color, then the calendar
  // assembles its pixels.
  // Saves what the user answered. Tags count only once the summary showed
  // them; check-in steps only once their slide was passed.
  const applyAnswers = () => {
    const hasSeenSummary = reached.current > SLIDE.summary;
    const selection = hasSeenSummary
      ? buildTagSelection(suggestions, removedTagKeys)
      : { categories: [], tags: [] };
    setSettings((current) => ({
      ...current,
      profileName: name.trim() || current.profileName,
      personalization: answers,
      steps:
        reached.current > SLIDE.capture
          ? getStepsForCapture({
              current: current.steps,
              offered: captureOptions,
              chosen: capture,
            })
          : current.steps,
    }));
    if (selection.categories.length > 0) {
      tagsUpdater.addSelection(selection);
    }
    // Counts only. Goal and struggles can reveal health: they stay here.
    analytics.track("onboarding:personalized", {
      has_name: name.trim().length > 0,
      category_count: selection.categories.length,
      tag_count: selection.tags.length,
      removed_tag_count: hasSeenSummary ? removedTagKeys.size : 0,
    });
  };

  const leave = () => {
    if (isLeaving) {
      return;
    }
    applyAnswers();
    addActionDone("onboarding");
    if (isReducedMotion) {
      router.replace("/calendar");
      return;
    }
    setIsLeaving(true);
    leaveTimer.current = setTimeout(() => {
      queueCalendarIntro();
      router.replace("/calendar");
    }, OUTRO_MS);
  };

  const finish = () => {
    analytics.track("onboarding:flow_completed");
    leave();
  };

  const skip = () => {
    analytics.track("onboarding:flow_skipped", { index });
    // Consent regions must see the analytics question, so skip lands there.
    if (needsConsent) {
      goToSlide(PRIVACY_SLIDE_INDEX);
      return;
    }
    leave();
  };

  const navigation = (slide: number) => ({
    index: slide,
    count: HEADER_SLIDE_COUNT,
    setIndex: goToSlide,
    onSkip: skip,
  });
  const advanceFrom = (slide: number) => () => goToSlide(slide + 1);
  const trimmedName = name.trim();

  const toggleStruggle = (struggle: PersonalizationStruggle) =>
    setAnswers((current) => ({
      ...current,
      struggles: current.struggles.includes(struggle)
        ? current.struggles.filter((item) => item !== struggle)
        : [...current.struggles, struggle],
    }));
  const toggleCapture = (option: CaptureOption) =>
    setCapture((current) => {
      const nextCapture = new Set(current);
      if (nextCapture.has(option)) {
        nextCapture.delete(option);
      } else {
        nextCapture.add(option);
      }
      return nextCapture;
    });
  // Places asks for location access right away and stays off without it.
  const togglePlaces = async () => {
    const nextValue = !isPlacesChosen;
    await location.setEnabled(nextValue);
    setIsPlacesChosen(nextValue && location.isAvailable);
  };
  const toggleTag = (key: string) =>
    setRemovedTagKeys((current) => {
      const nextKeys = new Set(current);
      if (nextKeys.has(key)) {
        nextKeys.delete(key);
      } else {
        nextKeys.add(key);
      }
      return nextKeys;
    });
  const stepLabels = [
    t("onboarding_summary_step_mood"),
    ...captureOptions.flatMap((option) =>
      capture.has(option) ? [tDynamic(`onboarding_capture_${option}`)] : []
    ),
    ...(isPlacesChosen ? [t("onboarding_capture_places")] : []),
    t("onboarding_summary_step_tags"),
  ];

  const slides = [
    <IndexSlide key="index" onPress={advanceFrom(SLIDE.welcome)} />,
    <NameSlide
      key="name"
      navigation={navigation(SLIDE.name)}
      name={name}
      onChangeName={setName}
      onNext={advanceFrom(SLIDE.name)}
    />,
    <GoalSlide
      key="goal"
      navigation={navigation(SLIDE.goal)}
      name={trimmedName}
      goal={answers.goal}
      onChangeGoal={(goal: PersonalizationGoal) =>
        setAnswers((current) => ({ ...current, goal }))
      }
      onNext={advanceFrom(SLIDE.goal)}
    />,
    <StrugglesSlide
      key="struggles"
      navigation={navigation(SLIDE.struggles)}
      struggles={answers.struggles}
      onToggleStruggle={toggleStruggle}
      onNext={advanceFrom(SLIDE.struggles)}
    />,
    <CaptureSlide
      key="capture"
      navigation={navigation(SLIDE.capture)}
      options={captureOptions}
      chosen={capture}
      onToggle={toggleCapture}
      hasPlaces={location.isAvailable}
      isPlacesChosen={isPlacesChosen}
      onTogglePlaces={togglePlaces}
      onNext={advanceFrom(SLIDE.capture)}
    />,
    <SummarySlide
      key="summary"
      navigation={navigation(SLIDE.summary)}
      name={trimmedName}
      steps={stepLabels}
      suggestions={suggestions}
      removedTagKeys={removedTagKeys}
      onToggleTag={toggleTag}
      onNext={advanceFrom(SLIDE.summary)}
    />,
    <ReminderSlide
      key="reminder"
      navigation={navigation(SLIDE.reminder)}
      onNext={advanceFrom(SLIDE.reminder)}
    />,
    <PrivacySlide key="privacy" onPress={finish} needsConsent={needsConsent} />,
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.calendarBackground }}>
      <OnboardingSky step={index} isVisible={!isLeaving} />
      {isLeaving ? null : (
        <Animated.View
          key={index}
          entering={SLIDE_ENTERING}
          exiting={SLIDE_EXITING}
          style={[
            StyleSheet.absoluteFill,
            { paddingTop: insets.top, paddingBottom: insets.bottom },
          ]}
        >
          {slides[index]}
        </Animated.View>
      )}
    </View>
  );
};
