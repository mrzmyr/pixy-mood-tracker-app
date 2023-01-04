import Alert from '@/components/Alert';
import { useAnalytics } from '@/hooks/useAnalytics';
import useColors from '@/hooks/useColors';
import useHaptics from '@/hooks/useHaptics';
import { LogItem, useLogState, useLogUpdater } from '@/hooks/useLogs';
import { useSettings } from '@/hooks/useSettings';
import { getItemDateTitle } from '@/lib/utils';
import { RootStackParamList, RootStackScreenProps } from '../../../../types';
import { t } from 'i18n-js';
import { Platform, Pressable, ScrollView, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from './Header';
import { Headline } from './Headline';
import { Message } from './Message';
import { Tags } from './Tags';
import { Emotions } from './Emotions';
import { Sleep } from './Sleep';
import dayjs from 'dayjs';
import { FeedbackBox } from '@/screens/DayView/FeedbackBox';

export const RatingDot = ({
  rating,
  onPress,
}: {
  rating: LogItem['rating'];
  onPress?: () => void;
}) => {
  const haptics = useHaptics();
  const colors = useColors();
  const { settings } = useSettings();
  const colorScheme = useColorScheme();

  const backgroundColor = colors.scales[settings.scaleType][rating].background;

  return (
    <Pressable
      onPress={async () => {
        if (onPress) {
          await haptics.selection()
          onPress();
        }
      }}
    >
      <View
        style={{
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 4,
          borderRadius: 6,
          backgroundColor: backgroundColor,
          width: 48,
          aspectRatio: 1,
          borderWidth: 1,
          borderColor: colorScheme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)',
        }}
      />
    </Pressable>
  )
};

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
          onAdd={() => {
            navigation.navigate('LogCreate', {
              dateTime: dayjs(item.date).hour(dayjs().hour()).minute(dayjs().minute()).toISOString()
            })
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
          <Sleep item={item} />
          <Emotions item={item} />
          <Tags item={item} />
          <Message item={item} />
          <FeedbackBox
            style={{
              marginTop: 16,
            }}
            prefix='log_view_changed'
            emoji='😱'
          />
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
