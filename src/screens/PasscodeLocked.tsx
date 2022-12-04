import * as LocalAuthentication from 'expo-local-authentication';
import { Alert, SafeAreaView, ScrollView, StatusBar, Text, View } from 'react-native';
import { Lock } from 'react-native-feather';
import LinkButton from '@/components/LinkButton';
import useColors from '../hooks/useColors';
import { usePasscode } from '../hooks/usePasscode';
import { useAnalytics } from '../hooks/useAnalytics';
import { t } from '@/helpers/translation';

export const PasscodeLocked = () => {
  const colors = useColors()
  const analytics = useAnalytics()
  const passcode = usePasscode()

  const retry = async () => {
    analytics.track('passcode_try')
    LocalAuthentication.authenticateAsync().then((result) => {
      passcode.setIsAuthenticated(result.success)
    })
  };

  const forgot = () => {
    analytics.track('passcode_forgot')

    Alert.alert(
      t('passcode_forgot'),
      t('passcode_forgot_description'),
      [
        {
          text: t('passcode_forgot_cancel'),
          style: 'cancel',
        },
        {
          text: t('passcode_forgot_reset'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              t('passcode_forgot_reset_confirm'),
              t('passcode_forgot_reset_confirm_description'),
              [
                {
                  text: t('passcode_forgot_reset_confirm_cancel'),
                  style: 'cancel',
                },
                {
                  text: t('passcode_forgot_reset_confirm_reset'),
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
            }}>{t('passcode_locked_title')}</Text>

            <Text style={{
              fontSize: 17,
              textAlign: 'center',
              color: colors.textSecondary,
            }}>{t('passcode_locked_message')}</Text>

            <LinkButton
              style={{
                marginTop: 20,
              }}
              onPress={retry}
            >{t('passcode_retry')}</LinkButton>
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
            >{t('passcode_forgot')}</LinkButton>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
