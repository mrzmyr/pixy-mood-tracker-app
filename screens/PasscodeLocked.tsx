import * as LocalAuthentication from 'expo-local-authentication';
import { SafeAreaView, ScrollView, StatusBar, Text, View } from 'react-native';
import { Lock } from 'react-native-feather';
import { Alert } from '../components/Alert';
import LinkButton from '../components/LinkButton';
import useColors from '../hooks/useColors';
import { usePasscode } from '../hooks/usePasscode';
import { useSegment } from '../hooks/useSegment';
import { useTranslation } from '../hooks/useTranslation';

export default function PasscodeLocked() {
  const colors = useColors()
  const i18n = useTranslation()
  const segment = useSegment()
  const passcode = usePasscode()
  
  const retry = async () => {
    segment.track('passcode_try')
    LocalAuthentication.authenticateAsync().then((result) => {
      passcode.setIsAuthenticated(result.success)
    })
  };

  const forgot = () => {
    segment.track('passcode_forgot')
    
    Alert.alert(
      i18n.t('passcode_forgot'), 
      i18n.t('passcode_forgot_description'),
      [
        {
          text: i18n.t('passcode_forgot_cancel'),
          style: 'cancel',
        },
        {
          text: i18n.t('passcode_forgot_reset'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              i18n.t('passcode_forgot_reset_confirm'), 
              i18n.t('passcode_forgot_reset_confirm_description'),
              [
                {
                  text: i18n.t('passcode_forgot_reset_confirm_cancel'),
                  style: 'cancel',
                },
                {
                  text: i18n.t('passcode_forgot_reset_confirm_reset'),
                  style: 'destructive',
                  onPress: () => {
                    passcode.setIsAuthenticated(true)
                  }
                }
              ],
              { cancelable: false }
            )
          }
        }
      ],
      { cancelable: false }
    )
  }
  
  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: StatusBar.currentHeight,
      }}
    >
      <ScrollView style={{
        flex: 1,
      }}>
        <View style={{
          flex: 1,
          minHeight: '100%',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}>
          <View style={{
            height: '90%',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <View style={{
              marginBottom: 20,
              justifyContent: 'center',
              alignItems: 'center',
              width: 70,
              height: 70,
              backgroundColor: colors.backgroundSecondary,
              borderRadius: 9999,
            }}>
              <Lock color={colors.text} width={40} height={30} />
            </View>
            <Text style={{
              fontSize: 21,
              fontWeight: 'bold',
              textAlign: 'center',
              color: colors.text,
              marginBottom: 10,
            }}>{i18n.t('passcode_locked_title')}</Text>

            <Text style={{
              fontSize: 17,
              textAlign: 'center',
              color: colors.textSecondary,
            }}>{i18n.t('passcode_locked_message')}</Text>
            
            <LinkButton
              style={{
                marginTop: 20,
              }}
              onPress={retry}
            >{i18n.t('passcode_retry')}</LinkButton>
          </View>
          <View style={{
            height: '10%',
          }}>
            <LinkButton
              type='secondary'
              style={{
                marginTop: 20,
              }}
              onPress={forgot}
            >{i18n.t('passcode_forgot')}</LinkButton>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
