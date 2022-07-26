import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { Switch, Text, View } from 'react-native';
import Clock from '../components/Clock';
import MenuList from '../components/MenuList';
import MenuListItem from '../components/MenuListItem';
import NotificationPreview from '../components/NotificationPreview';
import useColors from '../hooks/useColors';
import useNotification from '../hooks/useNotifications';
import { useSegment } from '../hooks/useSegment';
import { SettingsState, useSettings } from '../hooks/useSettings';
import { useTranslation } from '../hooks/useTranslation';

const Reminder = () => {
  const { setSettings, settings } = useSettings()
  const { 
    askForPermission, 
    hasPermission, 
    schedule, 
    cancelAll,
  } = useNotification()

  const [reminderEnabled, setReminderEnabled] = useState(settings.reminderEnabled);
  const [reminderTime, setReminderTime] = useState(settings.reminderTime);
  const colors = useColors()
  const i18n = useTranslation()
  const segment = useSegment()
  
  const hourAndMinute = reminderTime.split(':')
  const hour = parseInt(hourAndMinute[0])
  const minute = parseInt(hourAndMinute[1])
  const timeDate = dayjs().hour(hour).minute(minute).toDate()
  
  const onEnabledChange = async (value: boolean) => {
    const has = await hasPermission()
    if(!has) {
      await askForPermission()
    }
    if(!value) {
      await cancelAll()
    }
    segment.track('reminder_enabled_change', { enabled: value })
    setReminderEnabled(value && has)
  }
  
  useEffect(() => {
    (async () => {
      await cancelAll()
      await schedule({
        content: {
          title: i18n.t('notification_reminder_title'),
          body: i18n.t('notification_reminder_body'),
        },
        trigger: {
          repeats: true,
          hour: hour,
          minute: minute,
        },
      })
    })()
    
    setSettings((settings: SettingsState) => ({
      ...settings, 
      reminderEnabled,
      reminderTime,
    }))
  }, [reminderEnabled, reminderTime])
  
  const onTimeChange = async (event: any, selectedDate: any) => {
    segment.track('reminder_time_change', { time: dayjs(selectedDate).format('HH:mm') })
    setReminderTime(dayjs(selectedDate).format('HH:mm'))
  }
  
  return (
    <View>
      <View style={{
        opacity: reminderEnabled ? 1 : 0.5,
        marginBottom: 20,
      }}>
        <NotificationPreview />
      </View>
      <MenuList>
        <MenuListItem
          title={i18n.t('reminder')}
          iconRight={
            <Switch
              ios_backgroundColor={colors.backgroundSecondary}
              onValueChange={() => onEnabledChange(!reminderEnabled)}
              value={reminderEnabled}
              testID='reminder-enabled'
            />
          }
          isLast={!reminderEnabled}
        ></MenuListItem>
        { reminderEnabled &&
          <View
            style={{
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              width: '100%',
            }}
          >
            <View
              style={{
                flex: 1,
              }}
            >
              <Text
                style={{
                  color: colors.text,
                  fontSize: 17,
                }}
              >{i18n.t('time')}</Text>
            </View>
            <View
              style={{
                flex: 1,
              }}
            >
              <Clock
                onChange={onTimeChange}
                timeDate={timeDate}
              />
            </View>
          </View>
        }
      </MenuList>
    </View>
  )
}

export default Reminder;