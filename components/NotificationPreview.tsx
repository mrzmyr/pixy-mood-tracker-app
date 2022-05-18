import { Image, Text, View } from "react-native"
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
      padding: 4,
      paddingTop: 4,
      paddingBottom: 4,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 7,
      },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 5,
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
        marginLeft: 4,
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <View><Text style={{ color: colors.text, fontSize: 15, fontWeight: 'bold' }}>{i18n.t('notification_reminder_title')}</Text></View>
        </View>
        <View><Text style={{ color: colors.text, fontSize: 15, marginTop: 2 }}>{i18n.t('notification_reminder_body')}</Text></View>
      </View>
    </View>
  )
}
