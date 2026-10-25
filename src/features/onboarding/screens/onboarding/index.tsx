import { useRouter } from "expo-router";
import { useEffect, useEffectEvent, useState } from "react";
import { BackHandler, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useColors from "@/hooks/use-colors";
import { useAnalytics } from "@/state/analytics";
import { DEVICE_REQUIRES_CONSENT } from "@/state/analytics/consent";
import { useSettings } from "@/state/settings";
import { ExplainerSlide } from "./explainer-slide";
import { IndexSlide } from "./index-slide";
import { OnboardingSky } from "./onboarding-sky";
import { PrivacySlide } from "./privacy-slide";
import { ReminderSlide } from "./reminder-slide";

interface SlideProps {
  index: number;
  setIndex: (index: number) => void;
  onSkip: () => void;
}

const CalendarSlide = ({ ...props }: SlideProps) => (
  <ExplainerSlide {...props} />
);
const StatisticsSlide = ({ ...props }: SlideProps) => (
  <ExplainerSlide {...props} />
);
const FiltersSlide = ({ ...props }: SlideProps) => (
  <ExplainerSlide {...props} />
);

const PRIVACY_SLIDE_INDEX = 5;

// The old slide fades out while the clouds speed up, then the next one fades in.
const SLIDE_ENTERING = FadeIn.delay(250).duration(700);
const SLIDE_EXITING = FadeOut.duration(300);

/**
 * Onboarding flow, shown on start until the `onboarding` action is done.
 * Every slide sits on one drifting sky that speeds up between slides.
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
  const { addActionDone } = useSettings();
  const colors = useColors();
  const analytics = useAnalytics();
  const insets = useSafeAreaInsets();

  const [index, setIndex] = useState(0);

  const goToSlide = (nextIndex: number) => {
    setIndex(nextIndex);
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

  const finish = () => {
    addActionDone("onboarding");
    analytics.track("onboarding:flow_completed");
    router.replace("/calendar");
  };

  const skip = () => {
    analytics.track("onboarding:flow_skipped", { index });
    // Consent regions must see the analytics question, so skip lands there.
    if (needsConsent) {
      goToSlide(PRIVACY_SLIDE_INDEX);
      return;
    }
    addActionDone("onboarding");
    router.replace("/calendar");
  };

  const slides = [
    <IndexSlide key="index" onPress={() => goToSlide(1)} />,
    <CalendarSlide
      key="calendar"
      onSkip={skip}
      index={1}
      setIndex={goToSlide}
    />,
    <StatisticsSlide
      key="statistics"
      onSkip={skip}
      index={2}
      setIndex={goToSlide}
    />,
    <FiltersSlide key="filters" onSkip={skip} index={3} setIndex={goToSlide} />,
    <ReminderSlide
      key="reminder"
      onSkip={skip}
      index={4}
      setIndex={goToSlide}
    />,
    <PrivacySlide key="privacy" onPress={finish} needsConsent={needsConsent} />,
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.onboardingSkyBackground }}>
      <OnboardingSky step={index} />
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
    </View>
  );
};
