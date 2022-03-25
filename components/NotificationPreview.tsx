import { Image, Platform, Text, View } from "react-native"
import useColors from "../hooks/useColors"
import { useTranslation } from "../hooks/useTranslation"

export default function NotificationPreview() {
  const colors = useColors()
  const i18n = useTranslation()
  
  return (
    <View style={{
      flexDirection: 'row',
      backgroundColor: colors.notificationBackground,
      borderRadius: 15,
      padding: 10,
      height: 90,
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
        margin: 4,
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
          {Platform.OS === 'ios' &&
            <View><Text style={{ color: colors.textSecondary, fontSize: 16, marginRight: 5 }}>5 min ago</Text></View>
          }
        </View>
        <View><Text style={{ color: colors.text, fontSize: 17, marginTop: 5 }}>{i18n.t('notification_reminder_body')}</Text></View>
      </View>
    </View>
  )
}
