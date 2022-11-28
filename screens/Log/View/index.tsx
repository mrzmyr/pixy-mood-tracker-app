import { t } from 'i18n-js';
import { Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Alert from '../../../components/Alert';
import LinkButton from '../../../components/LinkButton';
import { useAnalytics } from '../../../hooks/useAnalytics';
import useColors from '../../../hooks/useColors';
import { useLogState, useLogUpdater } from '../../../hooks/useLogs';
import { getItemDateTitle } from '../../../lib/utils';
import { RootStackParamList, RootStackScreenProps } from '../../../types';
import { Emotions } from './Emotions';
import { Header } from './Header';
import { Headline } from './Headline';
import { Message } from './Message';
import { RatingDot } from './RatingDot';
import { Tags } from './Tags';

const PromoAddEntry = ({
  onClick
}) => {
  const colors = useColors();

  return (
    <View
      style={{
        marginBottom: 16,
        backgroundColor: colors.promoBackground,
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 8,
      }}
    >
      <Text style={{
        fontSize: 17,
        marginBottom: 8,
        fontWeight: 'bold',
        color: colors.promoText
      }}>⚡️ Multiple Entries per Day</Text>
      <Text style={{
        fontSize: 15,
        marginBottom: 16,
        lineHeight: 22,
        color: colors.promoText,
        opacity: 0.8
      }}>You can now add multiple entries per day. This is useful if feel different emotions throughout the day.</Text>
      <View
        style={{
          flexWrap: 'wrap',
          marginHorizontal: -20,
          paddingHorizontal: 12,
          marginBottom: -16,
          paddingBottom: 8,
          paddingTop: 8,
          borderTopColor: colors.promoBorder,
          borderTopWidth: 1,
        }}
      >
        <LinkButton
          style={{
            color: colors.promoText,
          }}
          onPress={onClick}
        >{t('add_entry')}</LinkButton>
      </View>
    </View>
  )
}

export const LogView = ({ navigation, route }: RootStackScreenProps<'LogView'>) => {
  const colors = useColors()
  const analytics = useAnalytics()
  const insets = useSafeAreaInsets();

  const logState = useLogState()
  const logUpdater = useLogUpdater()

  const item = logState?.items.find(i => i.id === route.params.id)

  if (!item) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }} />
    )
  };

  const close = () => {
    analytics.track('log_close')
    navigation.goBack()
  }

  const edit = (step: RootStackParamList['LogEdit']['step']) => {
    analytics.track('log_edit')
    navigation.navigate('LogEdit', { id: item.id, step });
  }

  const remove = () => {
    analytics.track('log_deleted')
    logUpdater.deleteLog(item.id)
    navigation.goBack()
  }

  const askToRemove = () => {
    return new Promise((resolve, reject) => {
      Alert.alert(
        t('delete_confirm_title'),
        t('delete_confirm_message'),
        [
          {
            text: t('delete'),
            onPress: () => resolve({}),
            style: "destructive"
          },
          {
            text: t('cancel'),
            onPress: () => reject(),
            style: "cancel"
          }
        ],
        { cancelable: true }
      );
    })
  }

  return (
    <View style={{
      flex: 1,
      backgroundColor: colors.logBackground,
    }}>
      <View
        style={{
          flex: 1,
          paddingTop: Platform.OS === 'android' ? insets.top : 0,
        }}
      >
        <Header
          title={getItemDateTitle(item.dateTime)}
          onClose={close}
          onDelete={async () => {
            if (
              item.message.length > 0 ||
              item?.tags && item?.tags.length > 0
            ) {
              askToRemove().then(() => remove())
            } else {
              remove()
            }
          }}
          onEdit={() => edit('rating')}
        />
        <ScrollView
          style={{
            flex: 1,
            flexDirection: 'column',
            paddingHorizontal: 16,
          }}
        >
          <View
            style={{
            }}
          >
            <Headline>{t('mood')}</Headline>
            <View
              style={{
                flexDirection: 'row',
              }}
            >
              <RatingDot onPress={() => edit('rating')} rating={item.rating} />
            </View>
          </View>
          <Emotions item={item} />
          <Tags item={item} />
          <Message item={item} />
          <View
            style={{
              height: insets.bottom,
              marginTop: 32,
            }}
          />
        </ScrollView>
      </View>
    </View>
  )
}
