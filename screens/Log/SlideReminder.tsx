import RNDateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { Bell } from 'react-native-feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../../components/Button';
import LinkButton from '../../components/LinkButton';
import useColors from '../../hooks/useColors';
import useNotification from '../../hooks/useNotifications';
import { useSegment } from '../../hooks/useSegment';
import { SettingsState, useSettings } from '../../hooks/useSettings';
import { useTranslation } from '../../hooks/useTranslation';
import { SlideHeadline } from './SlideHeadline';

export const SlideReminder = ({
  marginTop,
  onPress,
}: {
  marginTop: number;
  onPress?: () => void;
}) => {
  const { t, locale } = useTranslation()
  const { setSettings } = useSettings()
  const insets = useSafeAreaInsets();
  const segment = useSegment()
  const colors = useColors()

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
    segment.track('log_reminder_later')
    onPress()
  }

  const onEnable = async () => {
    segment.track('log_reminder_enable')
    await enable()
    onPress()
  }

  
  return (
    <View style={{ 
      flex: 1, 
      width: '100%',
      marginTop,
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
        <SlideHeadline>{t('log_reminder_question')}</SlideHeadline>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 17,
            textAlign: 'center',
            marginTop: 8,
            maxWidth: 300,
          }}
        >{t('log_reminder_descprition')}</Text>
      </View>
      <View
        style={{
          flex: 1,
        }}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
          }}
        >
          {Platform.OS === 'ios' && (
            <RNDateTimePicker 
              locale={locale}
              value={time} 
              onChange={(event, date) => setTime(date)} 
              display="spinner" 
              mode="time" 
            />
          )}
        </View>
        <View
          style={{
            justifyContent: 'flex-end',
            paddingBottom: insets.bottom,
          }}
        >
            <View>
              <Button 
                onPress={onEnable}
                style={{
                  marginBottom: 8,
                }}
              >{t('log_reminder_enabled')}</Button>
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
    </View>
  )
};
