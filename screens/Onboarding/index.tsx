import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useColors from '../../hooks/useColors';
import { useSegment } from "../../hooks/useSegment";
import { useSettings } from '../../hooks/useSettings';
import { RootStackScreenProps } from '../../types';
import { ExplainerSlide } from './ExplainerSlide';
import { IndexSlide } from './IndexSlide';
import { PrivacySlide } from './PrivacySlide';
import { ReminderSlide } from './ReminderSlide';

const CalendarSlide = ({ ...props }) => <ExplainerSlide {...props} />;
const StatisticsSlide = ({ ...props }) => <ExplainerSlide {...props} />;
const FiltersSlide = ({ ...props }) => <ExplainerSlide {...props} />;

export const Onboarding = ({ navigation }: RootStackScreenProps<'Onboarding'>) => {
  const { setSettings } = useSettings()
  const colors = useColors()
  const segment = useSegment()
  const insets = useSafeAreaInsets()

  const [index, _setIndex] = useState(0)

  const setIndex = (index: number) => {
    _setIndex(index)
    segment.track('onboarding_slide', { index })
  }

  const finish = () => {
    setSettings(settings => ({
      ...settings,
      actionsDone: [...settings.actionsDone, 'onboarding'],
    }))
    segment.track('onboarding_finished')
    navigation.navigate('BottomTabs')
  }

  const skip = () => {
    setSettings(settings => ({
      ...settings,
      actionsDone: [...settings.actionsDone, 'onboarding'],
    }))
    navigation.navigate('BottomTabs')
    segment.track('onboarding_skipped', { index })
  }
  
  const slides = [
    <IndexSlide 
      onPress={(answer) => {
        segment.track('onboarding_question_1', { 
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
