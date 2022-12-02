import { Text, View } from 'react-native';
import { Lock } from 'react-native-feather';
import Animated, { FadeInRight } from 'react-native-reanimated';
import Button from '@/components/Button';
import { t } from '@/helpers/translation';
import useColors from '../../hooks/useColors';

const ListItem = ({ children, delay }) => {
  const colors = useColors();

  return (
    <Animated.View
      style={{
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        marginBottom: 8,
      }}
      entering={FadeInRight.delay(delay)}
    >
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 4,
          backgroundColor: colors.onboardingListItemDot,
          marginRight: 12,
          marginTop: 9,
        }}
      />
      <Text
        style={{
          color: colors.onboardingListItemText,
          lineHeight: 24,
          fontSize: 17,
          flex: 1,
        }}
      >
        {children}
      </Text>
    </Animated.View>
  );
};

export const PrivacySlide = ({
  onPress
}: {
  onPress: () => void;
}) => {
  const colors = useColors();

  return (
    <>
      <View
        style={{
          flex: 1,
        }}
      >
        <View
          style={{
            flex: 1,
            paddingVertical: 32,
            paddingHorizontal: 32,
          }}
        >
          <View
            style={{
              flex: 1,
              paddingTop: 32,
              justifyContent: 'flex-start',
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: colors.onboardingPrivacyBadgeBackground,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <Lock width={24} height={24} color={colors.onboardingPrivacyBadgeVector} />
            </View>
            <Text
              style={{
                color: colors.onboardingTitle,
                fontSize: 24,
                lineHeight: 32,
                fontWeight: 'bold',
                marginBottom: 20,
                textAlign: 'center',
              }}
            >
              {t(`onboarding_step_5_title`)}
            </Text>
            <ListItem delay={100}>{t(`onboarding_step_5_body_1`)}</ListItem>
            <ListItem delay={200}>{t(`onboarding_step_5_body_2`)}</ListItem>
            <ListItem delay={300}>{t(`onboarding_step_5_body_3`)}</ListItem>
            <ListItem delay={400}>{t(`onboarding_step_5_body_4`)}</ListItem>
            <ListItem delay={500}>{t(`onboarding_step_5_body_5`)}</ListItem>
          </View>
          <View
            style={{
              width: '100%',
            }}
          >
            <Button
              onPress={onPress}
            >{t('onboarding_step_5_button')}</Button>
          </View>
        </View>
      </View>
    </>
  );
};
