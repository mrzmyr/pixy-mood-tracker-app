import * as Linking from 'expo-linking';
import * as LocalAuthentication from 'expo-local-authentication';
import * as StoreReview from 'expo-store-review';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Award, Bell, Database, Flag, Shield, Star } from 'react-native-feather';
import MenuList from '../components/MenuList';
import MenuListItem from '../components/MenuListItem';
import TextInfo from '../components/TextInfo';
import useColors from '../hooks/useColors';
import useFeedbackModal from '../hooks/useFeedbackModal';
import { useSegment } from '../hooks/useSegment';
import { useSettings } from '../hooks/useSettings';
import { useTranslation } from '../hooks/useTranslation';
import pkg from '../package.json';
import { RootStackScreenProps } from '../types';

export const SettingsScreen = ({ navigation }: RootStackScreenProps<'Settings'>) => {
  const { settings, setSettings } = useSettings()
  const colors = useColors()
  const i18n = useTranslation()
  const segment = useSegment()
  const [passcodeEnabled, setPasscodeEnabled] = useState(settings.passcodeEnabled);
  const [supportedSecurityLevel, setSupportedSecurityLevel] = useState<LocalAuthentication.SecurityLevel>(0);
  const passcodeSupported = supportedSecurityLevel > 0;

  const { show: showFeedbackModal, Modal: FeedbackModal } = useFeedbackModal();

  const askToRateApp = async () => {
    segment.track('rate_app')

    const storeUrl = StoreReview.storeUrl();
    if(storeUrl !== null) Linking.openURL(storeUrl)
  }

  useEffect(() => {
    segment.track('passcode_enable', { enabled: passcodeEnabled })
    setSettings((settings: SettingsState) => ({ ...settings, passcodeEnabled }))
  }, [passcodeEnabled])

  useEffect(() => {
    LocalAuthentication
      .getEnrolledLevelAsync()
      .then(level => {
        setSupportedSecurityLevel(level)
      })
  })
  
  return (
    <View style={{ 
      flex: 1,
      backgroundColor: colors.background,
    }}>
      <ScrollView
        style={{
          padding: 20,
        }}
      >
        <FeedbackModal />
        <View
          style={{
            alignItems: 'center',
          }}
        >
          <View
            style={{
              alignItems: 'center',
              marginTop: 10,
              width: '90%',
            }}
          >
            <Shield width={18} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, marginTop: 5, textAlign: 'center' }}>
              {i18n.t('data_notice')}
            </Text>
          </View>
        </View>
        <MenuList style={{ marginTop: 20, }}>
          <MenuListItem
            title={i18n.t('data')}
            iconLeft={<Database width={18} color={colors.menuListItemIcon} />}
            onPress={() => navigation.navigate('Data')}
            testID='data'
            isLink
          />
          <MenuListItem
            title={i18n.t('reminder')}
            iconLeft={<Bell width={18} color={colors.menuListItemIcon} />}
            onPress={() => navigation.navigate('Reminder')}
            testID='reminder'
            isLast
            isLink
          />
          {/* <MenuListItem
            title={i18n.t('passcode')}
            deactivated={!passcodeSupported}
            iconLeft={
              passcodeEnabled ? 
              <Lock width={18} color={colors.menuListItemIcon} /> :
              <Unlock width={18} color={colors.menuListItemIcon} />
            }
            iconRight={
              <Switch
                ios_backgroundColor={colors.backgroundSecondary}
                disabled={!passcodeSupported}
                onValueChange={() => {
                  segment.track('passcode_toggle', { enabled: !passcodeEnabled })
                  if(passcodeEnabled) {
                    setPasscodeEnabled(false)
                  } else {
                    LocalAuthentication.authenticateAsync().then((result) => {
                      setPasscodeEnabled(result.success)
                    })
                  }
                }}
                value={passcodeEnabled}
                testID={`passcode-enabled`}
              />
            }
            testID='passcode'
            isLast
          /> */}
          {/* <MenuListItem
            title={i18n.t('scales')}
            iconLeft={<Droplet width={18} color={colors.menuListItemIcon} />}
            onPress={() => navigation.navigate('Scales')}
            isLink
            isLast
          /> */}
        </MenuList>
        <MenuList
          style={{
            marginTop: 20,
          }}
        >
          <MenuListItem
            title={i18n.t('send_feedback')}
            onPress={() => showFeedbackModal({ type: 'issue' })}
            iconLeft={<Flag width={18} color={colors.menuListItemIcon} />}
            testID='send_feedback'
            isLast
          />
        </MenuList>
        <TextInfo>{i18n.t('feedback_help')}</TextInfo>
        <MenuList
          style={{
            marginTop: 20,
          }}
        >
          <MenuListItem
            title={i18n.t('rate_this_app')}
            onPress={() => askToRateApp()}
            iconLeft={<Star width={18} color={colors.menuListItemIcon} />}
          />
          <MenuListItem
            title={i18n.t('privacy')}
            onPress={() => navigation.navigate('Privacy')}
            iconLeft={<Shield width={18} color={colors.menuListItemIcon} />}
            isLink
          />
          <MenuListItem
            title={i18n.t('licenses')}
            iconLeft={<Award width={18} color={colors.menuListItemIcon} />}
            onPress={() => navigation.navigate('Licenses')}
            isLink
            isLast
          />
        </MenuList>
        <View
          style={{
            marginTop: 20,
            flex: 1,
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 14, marginTop: 5, marginBottom: 40, color: colors.textSecondary }}>Pixy v{pkg.version}</Text>
        </View>
      </ScrollView>
    </View>
  );
}
