import RNDateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { Image, ScrollView, Switch, Text, View } from 'react-native';
import MenuList from '../components/MenuList';
import MenuListItem from '../components/MenuListItem';
import useColors from '../hooks/useColors';
import useNotification from '../hooks/useNotifications';
import { SettingsState, useSettings } from '../hooks/useSettings';
import { useTranslation } from '../hooks/useTranslation';

export default function ReminderScreen() {
  const { setSettings, settings } = useSettings()
  const { 
    askForPermission, 
    hasPermission, 
    schedule, 
    cancelAll,
    getScheduled,
  } = useNotification()

  const [reminderEnabled, setReminderEnabled] = useState(settings.reminderEnabled);
  const [reminderTime, setReminderTime] = useState(settings.reminderTime);
  const [nextNotification, setNextNotification] = useState(null);
  const colors = useColors()
  const i18n = useTranslation()
  
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
    setReminderTime(dayjs(selectedDate).format('HH:mm'))
  }
  
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
      }}
    >
      <ScrollView style={{ 
        padding: 20,
      }}>
        <View style={{
          flexDirection: 'row',
          backgroundColor: colors.background,
          borderRadius: 15,
          padding: 10,
          marginBottom: 20,
          height: 90,
          opacity: reminderEnabled ? 1 : 0.5,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: 'white',
            width: 48,
            height: 48,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Image 
              style={{
                flex: 1,
                alignSelf: 'stretch',
                width: undefined,
                height: undefined
              }}
              source={require('../assets/images/icon-notification.png')} 
              resizeMode="contain"
            />
          </View>
          <View style={{
            flex: 1,
            justifyContent: 'center',
            marginLeft: 10,
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <View><Text style={{ color: colors.text, fontSize: 17, fontWeight: 'bold' }}>{i18n.t('notification_reminder_title')}</Text></View>
              <View><Text style={{ color: colors.textSecondary, fontSize: 16, marginRight: 5 }}>5 min ago</Text></View>
            </View>
            <View><Text style={{ color: colors.text, fontSize: 17, marginTop: 5 }}>{i18n.t('notification_reminder_body')}</Text></View>
          </View>
        </View>
        <MenuList>
          <MenuListItem
            title={i18n.t('reminder')}
            iconRight={
              <Switch
                ios_backgroundColor={colors.backgroundSecondary}
                onValueChange={() => onEnabledChange(!reminderEnabled)}
                value={reminderEnabled}
                testID={`reminder-enabled`}
              />
            }
            isLast={!reminderEnabled}
          ></MenuListItem>
          { reminderEnabled &&
            <MenuListItem
              title={i18n.t('time')}
              onPress={() => onEnabledChange(!reminderEnabled)}
              iconRight={
                <RNDateTimePicker
                  style={{flex: 1, height: 35, width: '100%' }} 
                  mode="time" 
                  display="clock" 
                  value={timeDate}
                  onChange={onTimeChange}
                />}
              isLast
            ></MenuListItem>
          }
        </MenuList>
      </ScrollView>
    </View>
  );
}
