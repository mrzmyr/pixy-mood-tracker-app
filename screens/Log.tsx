import dayjs from 'dayjs';
import { t } from 'i18n-js';
import { debounce } from "lodash";
import { useCallback, useEffect, useRef } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Edit2, Plus } from 'react-native-feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DismissKeyboard from '../components/DismisKeyboard';
import LinkButton from '../components/LinkButton';
import ModalHeader from '../components/ModalHeader';
import Tag from '../components/Tag';
import Scale from '../components/Scale';
import TextArea from '../components/TextArea';
import useColors from '../hooks/useColors';
import useHaptics from '../hooks/useHaptics';
import { LogItem, useLogs } from '../hooks/useLogs';
import { useSegment } from '../hooks/useSegment';
import { useSettings } from '../hooks/useSettings';
import { useTemporaryLog } from '../hooks/useTemporaryLog';
import { useTranslation } from '../hooks/useTranslation';
import { RootStackScreenProps } from '../types';

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

const TagEdit = ({
  tempLog,
  onPress
}) => {
  const colors = useColors()
  const { t } = useTranslation()
  
  return (
    <Pressable
      style={({ pressed }) => [{
        paddingTop: 8,
        paddingBottom: 8,
        paddingLeft: 16,
        paddingRight: 16,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        borderRadius: 100,
        backgroundColor: colors.tagsBackground,
        opacity: pressed ? 0.8 : 1,
        marginRight: 8,
        marginBottom: 8,
      }]}
      onPress={onPress}
      testID={'log-tags-edit'}
      accessibilityRole={'button'}
    >
      {
        tempLog.data.tags && tempLog.data.tags?.length > 0 ? (
          <Edit2 
            color={colors.tagsText} 
            width={17}
            style={{ margin: -4, marginRight: 4, }} 
          />
        ) : (
          <Plus 
            color={colors.tagsText}
            width={17}
            style={{ margin: -4, marginRight: 4, }} 
          />
        )
      }
      <Text 
        style={{ 
          color: colors.tagsText,
          fontSize: 17,
        }}
      >{tempLog.data.tags && tempLog.data.tags?.length > 0 ? t('tags_edit') : t('tags_add')}</Text>
    </Pressable>
  )
}

export const LogModal = ({ navigation, route }: RootStackScreenProps<'Log'>) => {
  
  const { settings } = useSettings()
  const colors = useColors()
  const i18n = useTranslation()
  const segment = useSegment()
  const haptics = useHaptics()
  const insets = useSafeAreaInsets();

  const { state, dispatch } = useLogs()
  const tempLog = useTemporaryLog();
  
  const defaultLogItem: LogItem = {
    date: route.params.date,
    rating: 'neutral',
    message: '',
    tags: [],
  }
  
  const existingLogItem = state?.items[route.params.date];

  useEffect(() => {
    tempLog.set(existingLogItem || defaultLogItem)
  }, [])

  const onClose = () => {
    tempLog.reset()
  }
  
  const save = () => {
    segment.track('log_saved', {
      date: tempLog.data.date,
      messageLength: tempLog.data.message.length,
      rating: tempLog.data.rating,
      tags: tempLog.data.tags.map(tag => ({
        ...tag,
        title: undefined
      })),
    })

    dispatch({
      type: existingLogItem ? 'edit' : 'add',
      payload: tempLog.data
    })

    if(
      Object.keys(state.items).length === 2 &&
      !settings.reminderEnabled
    ) {
      segment.track('reminder_modal_open')
      navigation.navigate('ReminderModal');
    } else {
      navigation.navigate('Calendar');
    }

    onClose()
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
  
  const remove = () => {
    segment.track('log_deleted')
    dispatch({
      type: 'delete', 
      payload: tempLog.data
    })
    navigation.navigate('Calendar');
    onClose()
  }

  const cancel = () => {
    segment.track('log_cancled')
    navigation.navigate('Calendar');
    onClose()
  }

  const trackMessageChange = useCallback(debounce(() => {
    segment.track('log_message_changed', {
      messageLength: tempLog.data.message.length
    })
  }, 1000), []);

  const setRating = (rating: LogItem['rating']) => {
    segment.track('log_rating_changed', {
      label: rating
    })
    tempLog.set((logItem) => ({ ...logItem, rating }))
  }
  const setMessage = (message: LogItem['message']) => {
    trackMessageChange()
    tempLog.set(logItem => ({ ...logItem, message }))
  }
  
  const placeholder = useRef(i18n.t(`log_modal_message_placeholder_${randomInt(1, 6)}`))
  
  return (
    <DismissKeyboard>
      <View style={{
        flex: 1,
        justifyContent: 'flex-start',
        backgroundColor: colors.logBackground,
        paddingBottom: 20,
        marginTop: Platform.OS === 'android' ? insets.top : 0,
      }}>
        <ModalHeader
          title={dayjs(route.params.date).format('ddd, L')}
          left={
            <LinkButton 
              testID='modal-cancel' 
              onPress={cancel} 
              type='secondary' 
            >{t('cancel')}</LinkButton>
          }
          right={
            <LinkButton 
              testID='modal-submit' 
              onPress={save}
              type='primary' 
            >{i18n.t('save')}</LinkButton>}
        />
        <ScrollView
          keyboardShouldPersistTaps='handled'
          style={{
            paddingTop: 8,
            paddingLeft: 16,
            paddingRight: 16,
            flex: 1,
          }}
        >
          <View
            style={{
              flex: 1,
            }}
          >
            <View
              style={{
                width: '100%',
                marginTop: 8,
              }}
            >
              <Scale
                type={settings.scaleType}
                value={tempLog.data.rating}
                onPress={setRating}
              />
            </View>

            <View
              style={{
                marginTop: 8,
              }}
            >
              <TextArea
                testID='modal-message'
                onChange={setMessage}
                placeholder={placeholder.current}
                value={tempLog.data.message}
                maxLength={10 * 1000}
                autoFocus
              />
            </View>

            <Pressable
              onPress={async () => {
                await haptics.selection()
                navigation.navigate('TagsModal', {
                  initialTags: tempLog.data.tags,
                })
              }}
            >
              <View style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
                marginTop: 16,
                paddingBottom: 8,
              }}>
                {tempLog.data?.tags && tempLog.data.tags.map(tag => (
                  <Tag colorName={tag.color} key={tag.id} title={tag.title} />
                ))}
                <View>
                  <TagEdit 
                    tempLog={tempLog}
                    onPress={async () => {
                      await haptics.selection()
                      navigation.navigate('TagsModal', {
                        initialTags: tempLog.data.tags,
                      })
                    }}
                  />
                </View>
              </View>
            </Pressable>
          </View>

          <View>
            {existingLogItem && (
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  marginBottom:  insets.bottom,
                }}
              >
                <LinkButton 
                  onPress={() => {
                    if(tempLog.data.message.length > 0) {
                      askToRemove().then(() => remove())
                    } else {
                      remove()
                    }
                  }} 
                  type='danger' 
                  icon={'Trash2'}
                  testID='modal-delete'
                >{i18n.t('delete')}</LinkButton>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </DismissKeyboard>
  );
}
