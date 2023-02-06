import * as Linking from 'expo-linking';
import * as StoreReview from 'expo-store-review';
import * as WebBrowser from 'expo-web-browser';
import { ScrollView, Text, View } from 'react-native';
import { ArrowUpCircle, Award, Bell, BookOpen, CheckCircle, Database, Droplet, Flag, PieChart, Shield, Smartphone, Star } from 'react-native-feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MenuList from '@/components/MenuList';
import MenuListHeadline from '@/components/MenuListHeadline';
import MenuListItem from '@/components/MenuListItem';
import TextInfo from '@/components/TextInfo';
import { CHANGELOG_URL, FEEDBACK_FEATURES_URL } from '@/constants/Config';
import { t } from '@/helpers/translation';
import { useAnalytics } from '../../hooks/useAnalytics';
import useColors from '../../hooks/useColors';
import useFeedbackModal from '../../hooks/useFeedbackModal';
import pkg from '../../../package.json';
import { RootStackScreenProps } from '../../../types';
import { UserDataImportList } from './UserData';
import * as Updates from 'expo-updates';
import { Github, Tag } from 'lucide-react-native';

export const SettingsScreen = ({ navigation }: RootStackScreenProps<'Settings'>) => {
  const insets = useSafeAreaInsets();
  const colors = useColors()
  const analytics = useAnalytics()

  const { show: showFeedbackModal, Modal: FeedbackModal } = useFeedbackModal();

  const askToRateApp = async () => {
    analytics.track('rate_app')

    const storeUrl = StoreReview.storeUrl();
    if (storeUrl !== null) Linking.openURL(storeUrl)
  }

  // const { settings, setSettings } = useSettings()
  // const passcodeSupported = supportedSecurityLevel > 0;
  // const [passcodeEnabled, setPasscodeEnabled] = useState(settings.passcodeEnabled);
  // const [supportedSecurityLevel, setSupportedSecurityLevel] = useState<LocalAuthentication.SecurityLevel>(0);

  // useEffect(() => {
  //   analytics.track('passcode_enable', { enabled: passcodeEnabled })
  //   setSettings((settings) => ({ ...settings, passcodeEnabled }))
  // }, [passcodeEnabled])

  // useEffect(() => {
  //   LocalAuthentication
  //     .getEnrolledLevelAsync()
  //     .then(level => {
  //       setSupportedSecurityLevel(level)
  //     })
  // })

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
            title={t('data')}
            iconLeft={<Database width={18} color={colors.menuListItemIcon} />}
            onPress={() => navigation.navigate('Data')}
            testID='data'
            isLink
          />
          <MenuListItem
            title={t('reminder')}
            iconLeft={<Bell width={18} color={colors.menuListItemIcon} />}
            onPress={() => navigation.navigate('Reminder')}
            testID='reminder'
            isLink
          />
          <MenuListItem
            title={t('colors')}
            iconLeft={<Droplet width={18} color={colors.menuListItemIcon} />}
            onPress={() => navigation.navigate('Colors')}
            isLink
          />
          <MenuListItem
            title={t('tags')}
            iconLeft={<Tag width={18} color={colors.menuListItemIcon} />}
            onPress={() => navigation.navigate('SettingsTags')}
            isLink
          />
          <MenuListItem
            title={t('steps')}
            iconLeft={<CheckCircle width={18} color={colors.menuListItemIcon} />}
            onPress={() => navigation.navigate('Steps')}
            isLink
            isLast
          />
          {/* <MenuListItem
            title={t('passcode')}
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
                  analytics.track('passcode_toggle', { enabled: !passcodeEnabled })
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

        </MenuList>

        <MenuListHeadline>{t('settings_feedback')}</MenuListHeadline>
        <MenuList
          style={{
          }}
        >
          <MenuListItem
            title={t('send_feedback')}
            onPress={() => showFeedbackModal({ type: 'issue' })}
            iconLeft={<Flag width={18} color={colors.menuListItemIcon} />}
            testID='send_feedback'
            isLast
          />
        </MenuList>
        <TextInfo>{t('feedback_help')}</TextInfo>

        <MenuListHeadline>{t('settings_about')}</MenuListHeadline>
        <MenuList
          style={{
          }}
        >
          <MenuListItem
            title={t('vote_features')}
            onPress={async () => {
              analytics.track('settings_vote_features')
              await WebBrowser.openBrowserAsync(FEEDBACK_FEATURES_URL);
            }}
            iconLeft={<ArrowUpCircle width={18} color={colors.menuListItemIcon} />}
            testID='vote_features'
          />
          <MenuListItem
            title={t('changelog')}
            onPress={async () => {
              analytics.track('settings_changelog')
              await WebBrowser.openBrowserAsync(CHANGELOG_URL);
            }}
            iconLeft={<BookOpen width={18} color={colors.menuListItemIcon} />}
            testID='changelog'
          />
          <MenuListItem
            title={t('rate_this_app')}
            onPress={() => askToRateApp()}
            iconLeft={<Star width={18} color={colors.menuListItemIcon} />}
          />
          <MenuListItem
            title={t('privacy')}
            onPress={() => navigation.navigate('Privacy')}
            iconLeft={<Shield width={18} color={colors.menuListItemIcon} />}
            isLink
          />
        </MenuList>

        <MenuListHeadline>{t('settings_development')}</MenuListHeadline>
        <MenuList
          style={{
          }}
        >
          <MenuListItem
            title={`${t('onboarding')}`}
            iconLeft={<Smartphone width={18} color={colors.menuListItemIcon} />}
            onPress={() => navigation.navigate('Onboarding')}
          />
          <MenuListItem
            title={`${t('settings_development_statistics')}`}
            iconLeft={<PieChart width={18} color={colors.menuListItemIcon} />}
            onPress={() => navigation.navigate('DevelopmentTools')}
            isLink
          />
          <MenuListItem
            title={t('app_is_open_source')}
            onPress={() => {
              Linking.openURL('https://github.com/mrzmyr/pixy-mood-tracker-app')
            }}
            iconLeft={<Github width={18} color={colors.menuListItemIcon} />}
          />
          <MenuListItem
            title={t('licenses')}
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
            marginBottom: 40,
          }}
        >
          <Text style={{ fontSize: 14, marginTop: 5, color: colors.textSecondary }}>Pixy v{pkg.version}</Text>
          {Updates.channel && <Text style={{ fontSize: 14, marginTop: 5, color: colors.textSecondary }}>{Updates.channel}</Text>}
        </View>

        {__DEV__ && <UserDataImportList />}
      </ScrollView>
    </View>
  );
}
