import * as StoreReview from 'expo-store-review';
import { ScrollView, Text, View } from 'react-native';
import { Award, Bell, Database, Flag, Lock, Shield, Star } from 'react-native-feather';
import MenuList from '../components/MenuList';
import MenuListItem from '../components/MenuListItem';
import TextInfo from '../components/TextInfo';
import useColors from '../hooks/useColors';
import useFeedbackModal from '../hooks/useFeedbackModal';
import { useSegment } from '../hooks/useSegment';
import { useTranslation } from '../hooks/useTranslation';
import pkg from '../package.json';
import { RootStackScreenProps } from '../types';

export default function SettingsScreen({ navigation }: RootStackScreenProps<'Settings'>) {
  const { show: showFeedbackModal, Modal } = useFeedbackModal();
  const colors = useColors()
  const i18n = useTranslation()
  const segment = useSegment()

  const askToRateApp = async () => {
    segment.track('rate_app')
    
    if (await StoreReview.hasAction()) {
      StoreReview.requestReview()
    }
  }

  return (
    <View style={{ 
      flex: 1,
      backgroundColor: colors.backgroundSecondary,
    }}>
      <ScrollView
        style={{
          padding: 20,
        }}
      >
        <Modal />
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
            <Lock width={18} color={colors.textSecondary} />
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
            isLink
            isLast
          />
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
          <Text style={{ fontSize: 14, marginTop: 5, marginBottom: 40, color: colors.textSecondary }}>{pkg.name} v{pkg.version}</Text>
        </View>
      </ScrollView>
    </View>
  );
}
