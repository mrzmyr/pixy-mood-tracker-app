import dayjs from 'dayjs';
import { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { Bell } from 'react-native-feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '@/components/Button';
import Clock from '@/components/Clock';
import LinkButton from '@/components/LinkButton';
import useColors from '@/hooks/useColors';
import useNotification from '@/hooks/useNotifications';
import { useAnalytics } from '@/hooks/useAnalytics';
import { SettingsState, useSettings } from '@/hooks/useSettings';
import { SlideHeadline } from "../components/SlideHeadline";
import { getLogEditMarginTop } from '@/helpers/responsive';
import { t } from '@/helpers/translation';

export const SlideReminder = ({
  onPress,
}: {
  onPress?: () => void;
}) => {
  const { setSettings } = useSettings()
  const insets = useSafeAreaInsets();
  const analytics = useAnalytics()
  const colors = useColors()
  const marginTop = getLogEditMarginTop()

  const {
    askForPermission,
    hasPermission,
    schedule,
    cancelAll,
  } = useNotification()

  const [time, setTime] = useState(dayjs().hour(20).minute(0).second(0).toDate());

  const enable = async () => {
    const has = await hasPermission()
    if (!has) {
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
    analytics.track('log_reminder_later')
    onPress?.()
  }

  const onEnable = async () => {
    analytics.track('log_reminder_enable')
    await enable()
    onPress?.()
  }

  return (
    <View style={{
      flex: 1,
      width: '100%',
      marginTop,
      paddingHorizontal: 20,
      paddingBottom: insets.bottom + 20,
    }}>
      <View
        style={{
          width: '100%',
          marginBottom: 8,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            width: 48,
            height: 48,
            backgroundColor: colors.palette.amber[500],
            borderRadius: 100,
            marginTop: 16,
            marginBottom: 16,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Bell color={'#fff'} width={20} strokeWidth={2} />
        </View>
        <SlideHeadline
          style={{
            justifyContent: 'center',
          }}
        >{t('log_reminder_question')}</SlideHeadline>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 17,
            textAlign: 'center',
            marginTop: 8,
            maxWidth: 300,
            lineHeight: 24,
          }}
        >{t('log_reminder_descprition')}</Text>
        <View
          style={{
            width: Platform.OS === 'ios' ? 80 : 65,
            justifyContent: 'center',
            paddingTop: 24,
          }}
        >
          <Clock
            timeDate={time}
            onChange={(event, date) => setTime(date)}
          />
        </View>
      </View>
      <View
        style={{
          flex: 1,
          justifyContent: 'flex-end',
        }}
      >
        <View
          style={{
          }}
        >
          <Button
            onPress={onEnable}
            style={{
              marginBottom: 8,
            }}
          >{t('log_reminder_enable')}</Button>
          <LinkButton
            type="secondary"
            onPress={onLater}
            style={{
              paddingTop: 16,
              paddingBottom: 16,
            }}
          >{t('log_reminder_later')}</LinkButton>
        </View>
      </View>
    </View>
  )
};
