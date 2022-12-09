import { Text, View } from 'react-native';
import Button from '@/components/Button';
import useColors from '../../hooks/useColors';
import { HeaderImage } from './HeaderImage';
import { HeaderNavigation } from "./HeaderNavigation";
import Animated, { FadeIn } from 'react-native-reanimated';
import { t } from '@/helpers/translation';

const Body = ({ index }: { index: number }) => {
  const colors = useColors()

  return (
    <View
      style={{
        flex: 1,
        paddingVertical: 32,
        paddingHorizontal: 32,
      }}
    >
      <Text
        style={{
          color: colors.onboardingTitle,
          fontSize: 20,
          fontWeight: 'bold',
          marginBottom: 8,
        }}
      >
        {t(`onboarding_step_${index}_title`)}
      </Text>
      <Text
        style={{
          color: colors.onboardingBody,
          fontSize: 17,
          lineHeight: 24,
        }}
      >
        {t(`onboarding_step_${index}_body`)}
      </Text>
    </View>
  )
}

export const ExplainerSlide = ({
  index,
  setIndex,
  onSkip,
}: {
  index: number;
  setIndex: (index: number) => void;
  onSkip: () => void;
}) => {
  const colors = useColors()

  return (
    <>
      <View
        style={{
          width: '100%',
          backgroundColor: colors.onboardingTopBackground,
          justifyContent: 'flex-end',
          alignItems: 'center',
          flex: 1,
        }}
      >
        <Animated.View
          style={{
            width: '100%',
            alignItems: 'center',
            flex: 1,
          }}
          entering={FadeIn.duration(800)}
        >
          <HeaderImage
            index={index}
            style={index === 3 ? {
              width: '90%',
              maxWidth: 340,
              flex: 1,
            } : {
              width: '90%',
              flex: 1,
            }} />
        </Animated.View>
      </View>
      <View
        style={{
          flex: 1,
        }}
      >
        <View
          style={{
            flex: 1,
          }}
        >
          <HeaderNavigation onSkip={onSkip} index={index} setIndex={setIndex} />
          <Animated.View
            style={{
              flex: 1,
            }}
            entering={FadeIn.duration(800)}
          >
            <Body index={index} />
          </Animated.View>
        </View>
        <View
          style={{
            padding: 32,
          }}
        >
          <Button
            onPress={() => setIndex(index + 1)}
          >{t('onboarding_next')}</Button>
        </View>
      </View>
    </>
  );
};
