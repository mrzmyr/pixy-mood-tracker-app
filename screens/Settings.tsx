import * as Linking from 'expo-linking';
import * as LocalAuthentication from 'expo-local-authentication';
import * as StoreReview from 'expo-store-review';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { ArrowUpCircle, Award, Bell, BookOpen, Database, Flag, Shield, Smartphone, Star } from 'react-native-feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const { settings, setSettings } = useSettings()
  const { t } = useTranslation()
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
      paddingTop: insets.top,
      flex: 1,
      backgroundColor: colors.background,
    }}>
      <ScrollView
        style={{
          padding: 20,
        }}
      >
        <FeedbackModal />
        <Text
            style={{
              fontSize: 32,
              color: colors.text,
              fontWeight: 'bold',
              marginTop: 32,
              marginBottom: 18,
            }}
          >{t('settings')}</Text>
        <MenuList>
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
            title={i18n.t('vote_features')}
            onPress={async () => {
              segment.track('settings_vote_features')
              await WebBrowser.openBrowserAsync('https://pixy.hellonext.co/embed/b/feedback?no_header=true');
            }}
            iconLeft={<ArrowUpCircle width={18} color={colors.menuListItemIcon} />}
            testID='vote_features'
          />
          <MenuListItem
            title={i18n.t('changelog')}
            onPress={async () => {
              segment.track('settings_changelog')
              await WebBrowser.openBrowserAsync('https://pixy.hellonext.co/embed/c?no_header=true');
            }}
            iconLeft={<BookOpen width={18} color={colors.menuListItemIcon} />}
            testID='changelog'
          />
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
          />
          <MenuListItem
            title={`${i18n.t('onboarding')}`}
            iconLeft={<Smartphone width={18} color={colors.menuListItemIcon} />}
            onPress={() => navigation.navigate('Onboarding')}
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
