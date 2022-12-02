import { Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import Button from '@/components/Button';
import { t } from '@/helpers/translation';
import useColors from '../../hooks/useColors';
import { HeaderImage } from './HeaderImage';

export const IndexSlide = ({
  onPress,
}: {
  onPress: (answer: number) => void;
}) => {
  const colors = useColors();

  return (
    <Animated.View
      style={{
        flex: 1,
      }}
      entering={FadeInUp.duration(1200)}
    >
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <HeaderImage
          index={0}
          style={{
            flex: 1,
            width: '100%',
          }} />
      </View>
      <View
        style={{
        }}
      >
        <View
          style={{
            paddingVertical: 20,
            paddingHorizontal: 20,
            alignItems: 'center',
          }}
        >
          <View
            style={{
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: colors.onboardingTitle,
                fontSize: 32,
                fontWeight: 'bold',
                marginBottom: 8,
                textAlign: 'center',
              }}
            >
              {t(`onboarding_step_0_title`)}
            </Text>
            <Text
              style={{
                color: colors.onboardingBody,
                textAlign: 'center',
                lineHeight: 24,
                fontSize: 17,
                maxWidth: 300,
              }}
            >
              {t(`onboarding_step_0_body`)}
            </Text>
          </View>
          <View
            style={{
              width: '100%',
              marginTop: 32,
            }}
          >
            <Button
              onPress={() => onPress(0)}
            >{t('onboarding_step_1_button_1')}</Button>
            <Button
              type='secondary'
              onPress={() => onPress(1)}
              style={{
                marginTop: 8,
              }}
            >{t('onboarding_step_1_button_2')}</Button>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};
