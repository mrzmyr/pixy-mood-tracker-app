import dayjs from 'dayjs';
import { t } from 'i18n-js';
import _, { debounce } from "lodash";
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, Keyboard, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Trash, X } from 'react-native-feather';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Carousel from 'react-native-reanimated-carousel';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useColors from '../../hooks/useColors';
import useHaptics from '../../hooks/useHaptics';
import { LogItem, useLogs } from '../../hooks/useLogs';
import { useSegment } from '../../hooks/useSegment';
import { useSettings } from '../../hooks/useSettings';
import { useTemporaryLog } from '../../hooks/useTemporaryLog';
import { RootStackScreenProps } from '../../types';
import { SlideAction } from './SlideAction';
import { SlideHeader } from './SlideHeader';
import { SlideNote } from './SlideNote';
import { SlideRating } from './SlideRating';
import { SlideReminder } from './SlideReminder';
import { SlideTags } from './SlideTags';
import { Stepper } from './Stepper';

export const LogModal = ({ navigation, route }: RootStackScreenProps<'Log'>) => {
  
  const { settings } = useSettings()
  const colors = useColors()
  const segment = useSegment()
  const haptics = useHaptics()
  const insets = useSafeAreaInsets();

  const { state, dispatch } = useLogs()
  const tempLog = useTemporaryLog();
  
  const defaultLogItem: LogItem = {
    date: route.params.date,
    rating: null,
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
    const eventData = {
      date: tempLog.data.date,
      messageLength: tempLog.data.message.length,
      rating: tempLog.data.rating,
      tags: tempLog?.data?.tags.map(tag => _.omit(tag, 'title')),
    }
    
    if(tempLog.data.rating === null) {
      tempLog.data.rating = 'neutral'
    }
    
    segment.track('log_saved', eventData)

    if(existingLogItem) {
      segment.track('log_changed', eventData)
    } else {
      segment.track('log_created', eventData)
    }

    dispatch({
      type: existingLogItem ? 'edit' : 'add',
      payload: tempLog.data
    })

    onClose()
    navigation.navigate('Calendar');
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
  const setTags = (tags: LogItem['tags']) => {
    segment.track('log_tags_changed', {
      tags: tags?.map(tag => _.omit(tag, 'title'))
    })
    tempLog.set(logItem => ({ ...logItem, tags }))
  }

  const _carousel = useRef(null);
  const [slideIndex, setSlideIndex] = useState(0)
  const [touched, setTouched] = useState(false)
  
  let marginTop = 32;

  if(Dimensions.get('screen').height < 800) marginTop = 32;
  if(Dimensions.get('screen').height < 700) marginTop = 16;
  
  const content = [{
      slide: (
        <SlideRating
          marginTop={marginTop}
          onChange={(rating) => {
            if(tempLog.data.rating !== rating) {
              setTimeout(() => _carousel.current.next(), 200)
            }
            setRating(rating)
          }}
        />
      ),
      action: <SlideAction type="next" onPress={() => _carousel.current.next()} />
    }, {
      slide: <SlideTags marginTop={marginTop} onChange={setTags} />,
      action: <SlideAction type="next" onPress={() => _carousel.current.next()} />
    }, {
      slide: <SlideNote marginTop={marginTop} onChange={setMessage} />,
      action: <SlideAction type="save" onPress={save} />
    }
  ]

  if(
    Object.keys(state.items).length === 2 &&
    !settings.reminderEnabled
  ) {
    content[2].action = <SlideAction type="next" onPress={() => _carousel.current.next()} />
    content.push({
      slide: (
        <SlideReminder 
          onPress={async () => {
            await navigation.navigate('Calendar');
            save()
          }}
          marginTop={marginTop} 
        />
      ),
      action: <SlideAction type="hidden" />
    })
  }
  
  const onScrollEnd = (index) => {
    if(index !== 2) {
      Keyboard.dismiss()
    }
    setSlideIndex(index)
  }

  
  return (
    <View style={{ 
      flex: 1,
      backgroundColor: colors.logBackground,
      position: 'relative',
    }}>
      <View
        style={{
          flex: 1,
          paddingTop: Platform.OS === 'android' ? insets.top : 0,
          padding: 20,
        }}
      >
        <Stepper 
          count={content.length} 
          index={slideIndex} 
          scrollTo={({ index }) => {
            _carousel.current.scrollTo({ index, animated: true })
            onScrollEnd(index)
          }}
        />
        <SlideHeader
          left={
            <View
              style={{
                flexDirection: 'row',
              }}
            >
              <Text 
                style={{ 
                  fontSize: 17,
                  fontWeight: '600',
                  color: colors.logHeaderText,
                }}
              >{dayjs(route.params.date).isSame(dayjs(), 'day') ? t('today') : dayjs(route.params.date).format('dddd, L')}</Text>
            </View>
          }
          right={
            <View
              style={{
                flexDirection: 'row',
              }}
            >
              {existingLogItem && (
                <Pressable
                  style={{
                    marginRight: 8,
                    padding: 8,
                  }}
                  onPress={async () => {
                    await haptics.selection()
                    if(
                      tempLog.data.message.length > 0 ||
                      tempLog.data?.tags.length > 0
                    ) {
                      askToRemove().then(() => remove())
                    } else {
                      remove()
                    }
                  }} 
                >
                  <Trash color={colors.logHeaderText} width={24} height={24} />
                </Pressable>
              )}
              <Pressable
                style={{
                  padding: 8,
                }}
                onPress={async () => {
                  await haptics.selection()
                  cancel()
                }}
              >
                <X color={colors.logHeaderText} width={24} height={24} />
              </Pressable>
            </View>
          }
        />
        <View
          style={{
            flex: 1,
            flexDirection: 'column',
          }}
        >
          <Carousel
            loop={false}
            width={Dimensions.get('window').width - 40}
            ref={_carousel}
            data={content}
            onScrollBegin={() => {
              setTouched(true)
            }}
            onScrollEnd={onScrollEnd}
            renderItem={({ index }) => content[index].slide}
            panGestureHandlerProps={{
              activeOffsetX: [-10, 10],
            }}
          />
        </View>
      </View>
      {(slideIndex !== 0 || touched) && content[slideIndex] && content[slideIndex].action}
    </View>
  )
}
