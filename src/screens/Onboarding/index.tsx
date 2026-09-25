import { useEffect, useEffectEvent, useState } from "react";
import { BackHandler, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useColors from "../../hooks/useColors";
import { useAnalytics } from "../../hooks/useAnalytics";
import { useSettings } from "../../hooks/useSettings";
import type { RootStackScreenProps } from "../../../types";
import { ExplainerSlide } from "./ExplainerSlide";
import { IndexSlide } from "./IndexSlide";
import { PrivacySlide } from "./PrivacySlide";
import { ReminderSlide } from "./ReminderSlide";

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

/**
 * Onboarding flow, shown on start until the `onboarding` action is done.
 * Finishing or skipping records that action and returns to the root.
 */
export const Onboarding = ({
  navigation,
}: RootStackScreenProps<"Onboarding">) => {
  const { addActionDone } = useSettings();
  const colors = useColors();
  const analytics = useAnalytics();
  const insets = useSafeAreaInsets();

  const [index, setIndex] = useState(0);

  const goToSlide = (nextIndex: number) => {
    setIndex(nextIndex);
    analytics.track("onboarding_slide", { index: nextIndex });
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
    analytics.track("onboarding_finished");
    navigation.popToTop();
  };

  const skip = () => {
    addActionDone("onboarding");
    navigation.popToTop();
    analytics.track("onboarding_skipped", { index });
  };

  const slides = [
    <IndexSlide
      key="index"
      onPress={() => goToSlide(1)}
    />,
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
    <PrivacySlide key="privacy" onPress={finish} />,
  ];

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.onboardingBottomBackground,
        paddingBottom: insets.bottom,
      }}
    >
      {slides[index]}
    </View>
  );
};
