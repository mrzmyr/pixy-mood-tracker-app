import { useRouter } from "expo-router";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { BackHandler, StyleSheet, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useReducedMotion,
  useSharedValue,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { queueCalendarIntro } from "@/features/calendar";
import { usePixyIdle } from "@/features/logger";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useColors from "@/hooks/use-colors";
import { useAnalytics } from "@/state/analytics";
import { DEVICE_REQUIRES_CONSENT } from "@/state/analytics/consent";
import { useSettings } from "@/state/settings";
import { ExplainerSlide } from "./explainer-slide";
import { IndexSlide } from "./index-slide";
import { SteppedSky } from "@/components/stepped-sky";
import { SkyPixy } from "@/components/sky-pixy";
import { PrivacySlide } from "./privacy-slide";
import { FlightZoneContext } from "@/components/flight-zone-context";
import type { FlightZone } from "@/components/sky-pixy";
import { ReminderSlide } from "./reminder-slide";
import { SLIDE_TEXT_DELAY_MS } from "./slide-timing";

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
const SLIDE_ENTERING = FadeIn.delay(SLIDE_TEXT_DELAY_MS).duration(700);
const SLIDE_EXITING = FadeOut.duration(300);

/** Cloud Pixy with the blink of the confirmation Pixy. */
const BlinkingSkyPixy = (props: {
  boost: SharedValue<number>;
  zone: FlightZone | null;
}) => {
  const idle = usePixyIdle({ isEnabled: true, isReducedMotion: false });
  return <SkyPixy {...props} isBlinking={idle.isBlinking} />;
};

/** Time for the last slide and the sky to fade into the calendar color. */
const OUTRO_MS = 450;

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
  const [isLeaving, setIsLeaving] = useState(false);
  const [flightZone, setFlightZone] = useState<FlightZone | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isReducedMotion = useReducedMotion();
  const skyBoost = useSharedValue(0);

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
  const leave = () => {
    if (isLeaving) {
      return;
    }
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
    <View style={{ flex: 1, backgroundColor: colors.calendarBackground }}>
      <SteppedSky step={index} isVisible={!isLeaving} boost={skyBoost} />
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
          <FlightZoneContext.Provider value={setFlightZone}>
            {slides[index]}
          </FlightZoneContext.Provider>
        </Animated.View>
      )}
      {/* Above the slides so it takes taps. Its zones keep it off text and
          controls. */}
      {isReducedMotion ? null : (
        <BlinkingSkyPixy
          boost={skyBoost}
          zone={isLeaving ? null : flightZone}
        />
      )}
    </View>
  );
};
