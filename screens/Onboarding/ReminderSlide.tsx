import { Platform, Text, View } from 'react-native';
import Button from '../../components/Button';
import useColors from '../../hooks/useColors';
import { useTranslation } from '../../hooks/useTranslation';
import { HeaderImage } from './HeaderImage';
import { HeaderNavigation } from "./HeaderNavigation";
import Animated, { FadeInRight } from 'react-native-reanimated'; 
import Clock from '../../components/Clock';
import useNotification from '../../hooks/useNotifications';
import { useState } from 'react';
import dayjs from 'dayjs';
import { SettingsState, useSettings } from '../../hooks/useSettings';
import { useSegment } from '../../hooks/useSegment';
import LinkButton from '../../components/LinkButton';

const Body = ({ index }: { index: number }) => {
  const colors = useColors()
  const { t } = useTranslation()

  return (
    <View
      style={{
        paddingVertical: 16,
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

export const ReminderSlide = ({ 
  index, 
  setIndex,
  onSkip,
}: {
  index: number;
  setIndex: (index: number) => void;
  onSkip: () => void;
}) => {
  const colors = useColors()
  const { t } = useTranslation();
  const { setSettings } = useSettings()
  const segment = useSegment()

  const { 
    askForPermission, 
    hasPermission, 
    schedule, 
    cancelAll,
  } = useNotification()
  
  const [time, setTime] = useState(dayjs().hour(20).minute(0).second(0).toDate());
  
  const enable = async () => {
    const has = await hasPermission()
    if(!has) {
      await askForPermission()
    }

    await (async () => {
      await cancelAll()
      await schedule({
        trigger: {
          repeats: true,
          hour: dayjs(time).hour(),
          minute: dayjs(time).minute(),
        },
      })

      setSettings((settings: SettingsState) => ({
        ...settings, 
        reminderEnabled: true,
        reminderTime: dayjs(time).format('HH:mm'),
      }))
    })()
  }
  
  const onLater = () => {
    segment.track('onboarding_reminder_later')
    setIndex(index + 1)
  }

  const onEnable = async () => {
    segment.track('onboarding_reminder_enable')
    await enable()
    setIndex(index + 1)
  }

  return (
    <>
      <Animated.View
        style={{
          width: '100%',
          backgroundColor: colors.onboardingTopBackground,
          alignItems: 'center',
          flex: 1,
        }}
        entering={FadeInRight.duration(500)}
      >
        <HeaderImage
          index={index}
          style={{
            width: '95%',
            maxHeight: '100%',
            maxWidth: 360,
          }} />
      </Animated.View>
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
            entering={FadeInRight.duration(500)}
          >
            <Body index={index} />
            <View
              style={{
                paddingHorizontal: 32,
              }}
            >
              <View
                style={{
                  maxWidth: Platform.OS === 'ios' ? 80 : 65,
                  justifyContent: 'center',
                }}
              >
                <Clock 
                  timeDate={time}
                  onChange={(event, date) => setTime(date)} 
                  style={{
                  }}
                />
              </View>
            </View>
          </Animated.View>
        </View>
        <View
          style={{
            paddingHorizontal: 32,
            paddingVertical: 16,
          }}
        >
          <Button
            onPress={onEnable}
          >{t('onboarding_step_4_button_1')}</Button>
          <LinkButton
            type='secondary'
            onPress={onLater}
            style={{
              paddingTop: 16,
              paddingBottom: 16,
            }}
          >{t('onboarding_step_4_button_2')}</LinkButton>
        </View>
      </View>
    </>
  );
};
