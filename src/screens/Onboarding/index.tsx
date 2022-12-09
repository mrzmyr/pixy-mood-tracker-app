import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useColors from '../../hooks/useColors';
import { useAnalytics } from "../../hooks/useAnalytics";
import { useSettings } from '../../hooks/useSettings';
import { RootStackScreenProps } from '../../../types';
import { ExplainerSlide } from './ExplainerSlide';
import { IndexSlide } from './IndexSlide';
import { PrivacySlide } from './PrivacySlide';
import { ReminderSlide } from './ReminderSlide';

type SlideProps = {
  index: number;
  setIndex: (index: number) => void;
  onSkip: () => void;
};

const CalendarSlide = ({ ...props }: SlideProps) => <ExplainerSlide {...props} />;
const StatisticsSlide = ({ ...props }: SlideProps) => <ExplainerSlide {...props} />;
const FiltersSlide = ({ ...props }: SlideProps) => <ExplainerSlide {...props} />;

export const Onboarding = ({ navigation }: RootStackScreenProps<'Onboarding'>) => {
  const { addActionDone } = useSettings()
  const colors = useColors()
  const analytics = useAnalytics()
  const insets = useSafeAreaInsets()

  const [index, _setIndex] = useState(0)

  const setIndex = (index: number) => {
    _setIndex(index)
    analytics.track('onboarding_slide', { index })
  }

  const finish = () => {
    addActionDone('onboarding')
    analytics.track('onboarding_finished')
    navigation.popToTop()
  }

  const skip = () => {
    addActionDone('onboarding')
    navigation.popToTop()
    analytics.track('onboarding_skipped', { index })
  }

  const slides = [
    <IndexSlide
      onPress={(answer) => {
        analytics.track('onboarding_question_1', {
          answer: answer === 0 ?
            'used_mood_tracker_before' :
            'never_used_mood_tracker'
        })
        setIndex(1)
      }}
    />,
    <CalendarSlide onSkip={skip} index={1} setIndex={setIndex} />,
    <StatisticsSlide onSkip={skip} index={2} setIndex={setIndex} />,
    <FiltersSlide onSkip={skip} index={3} setIndex={setIndex} />,
    <ReminderSlide onSkip={skip} index={4} setIndex={setIndex} />,
    <PrivacySlide onPress={finish} />,
  ]

  return (
    <View style={{
      flex: 1,
      backgroundColor: colors.onboardingBottomBackground,
      paddingBottom: insets.bottom,
    }}>
      {slides[index]}
    </View>
  );
}
