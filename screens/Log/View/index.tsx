import dayjs from 'dayjs';
import { t } from 'i18n-js';
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Tag from '../../../components/Tag';
import useColors from '../../../hooks/useColors';
import useHaptics from '../../../hooks/useHaptics';
import { useLogs } from '../../../hooks/useLogs';
import { useAnalytics } from '../../../hooks/useAnalytics';
import { RootStackParamList, RootStackScreenProps } from '../../../types';
import { Header } from './Header';
import { Headline } from './Headline';
import { RatingDot } from './RatingDot';

export const LogView = ({ navigation, route }: RootStackScreenProps<'LogView'>) => {
  const colors = useColors()
  const analytics = useAnalytics()
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();

  const { state, dispatch } = useLogs()
  
  const item = state?.items[route.params.date];

  const close = () => {
    analytics.track('log_close')
    navigation.popToTop()
  }

  const edit = (slide: RootStackParamList['LogEdit']['slide']) => {
    analytics.track('log_edit')
    navigation.navigate('LogEdit', { date: route.params.date, slide });
  }
  
  const remove = () => {
    analytics.track('log_deleted')
    dispatch({
      type: 'delete', 
      payload: item
    })
    navigation.popToTop()
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
          title={dayjs(route.params.date).isSame(dayjs(), 'day') ? t('today') : dayjs(route.params.date).format('ddd, L')}
          onClose={close}
          onDelete={async () => {
            if(
              item.message.length > 0 ||
              item?.tags.length > 0
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
              {item?.rating && <RatingDot onPress={() => edit('rating')} rating={item?.rating} />}
            </View>
          </View>
          <View
            style={{
              marginTop: 24,
            }}
          >
            <Headline>{t('tags')}</Headline>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
              }}
            >
              {(item?.tags && item?.tags?.length) ? item?.tags?.map(tag => (
                <Tag 
                  colorName={tag.color}
                  selected={false} 
                  key={tag.id} 
                  title={tag.title}
                  onPress={() => edit('tags')}
                />
              )) : (
                <View
                  style={{
                    padding: 8,
                  }}
                >
                  <Text style={{ color: colors.textSecondary, fontSize: 17 }}>No tags</Text>
                </View>
              )}
            </View>
          </View>
          <View
            style={{
              marginTop: 24,
            }}
          >
            <Headline>{t('view_log_message')}</Headline>
            <View
              style={{
                flexDirection: 'row',
              }}
            >
              {item?.message?.length > 0 ? (
                <Pressable
                  onPress={async () => {
                    await haptics.selection()
                    edit('message')
                  }}
                  style={{
                    width: '100%',
                  }}
                >
                  <View
                    style={{
                      backgroundColor: colors.logCardBackground,
                      borderRadius: 8,
                      padding: 16,
                      width: '100%',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 17,
                        color: colors.text,
                        lineHeight: 23,
                        width: '100%',
                      }}
                    >{item.message}</Text>
                  </View>
                </Pressable>
              ) : (
                <View
                  style={{
                    padding: 8,
                  }}
                >
                  <Text style={{ 
                    color: colors.textSecondary, 
                    fontSize: 17, 
                    lineHeight: 24,
                  }}>{t('view_log_message_empty')}</Text>
                </View>
              )}
            </View>
          </View>
          <View 
            style={{
              height: insets.bottom
            }}
          />
        </ScrollView>
      </View>
    </View>
  )
}
