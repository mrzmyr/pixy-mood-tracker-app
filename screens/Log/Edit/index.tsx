import dayjs from 'dayjs';
import { t } from 'i18n-js';
import _ from "lodash";
import { ReactElement, useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, Keyboard, Platform, View } from 'react-native';
import Carousel from 'react-native-reanimated-carousel';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { QUESTIONS_PULL_URL } from '../../../constants/API';
import useColors from '../../../hooks/useColors';
import { LogItem, useLogs } from '../../../hooks/useLogs';
import { useSegment } from '../../../hooks/useSegment';
import { useSettings } from '../../../hooks/useSettings';
import { useTemporaryLog } from '../../../hooks/useTemporaryLog';
import { useTranslation } from '../../../hooks/useTranslation';
import { RootStackScreenProps } from '../../../types';
import { SlideAction } from './SlideAction';
import { SlideHeader } from './SlideHeader';
import { SlideNote } from './SlideNote';
import { IQuestion, SlideQuestion } from './SlideQuestion';
import { SlideRating } from './SlideRating';
import { SlideReminder } from './SlideReminder';
import { SlideTags } from './SlideTags';
import { Stepper } from './Stepper';

const SLIDE_INDEX_MAPPING = {
  rating: 0,
  tags: 1,
  message: 2,
}

export const LogEdit = ({ navigation, route }: RootStackScreenProps<'LogEdit'>) => {
  
  const { settings, hasActionDone } = useSettings()
  const colors = useColors()
  const segment = useSegment()
  const insets = useSafeAreaInsets();

  const { state, dispatch } = useLogs()
  const tempLog = useTemporaryLog();
  const { language } = useTranslation();
  
  const existingLogItem = state?.items[route.params.date];

  const defaultLogItem: LogItem = {
    date: route.params.date,
    rating: null,
    message: '',
    tags: [],
  }

  const [question, setQuestion] = useState<IQuestion | null>(null);
  
  useEffect(() => {
    tempLog.set(existingLogItem || defaultLogItem)

    fetch(QUESTIONS_PULL_URL)
      .then(response => response.json())
      .then(data => {
        const question = data.find((question: IQuestion) => {
          return (
            !hasActionDone(`question_slide_${question.id}`) &&
            question.text[language]
          )
        })
        if(question) {
          setQuestion(question)
        }
      })
      .catch(error => console.log(error))
  }, [])

  const close = async () => {
    tempLog.reset()
    navigation.popToTop();
  }
  
  const save = () => {
    const eventData = {
      date: tempLog.data.date,
      messageLength: tempLog.data.message.length,
      rating: tempLog.data.rating,
      tags: tempLog?.data?.tags?.map(tag => ({
        ...(_.omit(tag, 'title')),
        tagLength: tag.title.length,
      })),
      tagsCount: tempLog?.data?.tags?.length,
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

    close()
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

  const askToCancel = () => {
    return new Promise((resolve, reject) => {
      Alert.alert(
        t('cancel_confirm_title'),
        t('cancel_confirm_message'),
        [
          {
            text: t('discard_changes'),
            onPress: () => resolve({}),
            style: "destructive"
          },
          { 
            text: t('keep_editing'), 
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
    close()
  }

  const cancel = () => {
    segment.track('log_cancled')
    close()
  }

  const setRating = (rating: LogItem['rating']) => {
    segment.track('log_rating_changed', {
      label: rating
    })
    tempLog.set((logItem) => ({ ...logItem, rating }))
  }

  const setMessage = (message: LogItem['message']) => {
    tempLog.set(logItem => ({ ...logItem, message }))
  }

  const setTags = (tags: LogItem['tags']) => {
    segment.track('log_tags_changed', {
      tags: tags?.map(tag => ({
        ...(_.omit(tag, 'title')),
        tagLength: tag.title.length,
      })),
    })
    tempLog.set(logItem => ({ ...logItem, tags }))
  }

  const initialIndex = SLIDE_INDEX_MAPPING[route.params.slide] || 0
  
  const _carousel = useRef(null);
  const [slideIndex, setSlideIndex] = useState(initialIndex)
  const [touched, setTouched] = useState(false)
  
  let marginTop = 32;

  if(Dimensions.get('screen').height < 800) marginTop = 32;
  if(Dimensions.get('screen').height < 700) marginTop = 16;
  
  const content: {
    slide: ReactElement,
    action?: ReactElement,
  }[] = [{
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
    }, {
      slide: <SlideTags marginTop={marginTop} onChange={setTags} />,
    }, {
      slide: <SlideNote marginTop={marginTop} onChange={setMessage} />,
    }
  ]

  if(
    Object.keys(state.items).length === 2 &&
    !settings.reminderEnabled
  ) {
    content.push({
      slide: (
        <SlideReminder 
          onPress={async () => {
            save()
          }}
          marginTop={marginTop} 
        />
      ),
      action: <SlideAction type="hidden" />
    })
  }

  if(
    Object.keys(state.items).length % 2 === 0 && 
    question !== null &&
    existingLogItem === undefined
  ) {
    content.push({
      slide: (
        <SlideQuestion
          question={question}
          onPress={async () => {
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

  const tempLogHasChanges = (
    tempLog.data.message.length > 0 || 
    tempLog.data?.tags?.length > 0 ||
    tempLog.data.rating !== null
  )
  const existingLogItemHasChanges = (
    tempLog.data.message.length !== existingLogItem?.message.length || 
    tempLog.data?.tags?.length !== existingLogItem?.tags?.length ||
    tempLog.data.rating !== existingLogItem?.rating
  )
  
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
          title={dayjs(route.params.date).isSame(dayjs(), 'day') ? t('today') : dayjs(route.params.date).format('dddd, L')}
          isDeleteable={existingLogItem !== undefined}
          onClose={() => {
            if(
              !existingLogItem && tempLogHasChanges ||
              !!existingLogItem && existingLogItemHasChanges
            ) {
              askToCancel().then(() => cancel()).catch(() => {})
            } else {
              cancel()
            }
          }}
          onDelete={() => {
            if(
              tempLog.data.message.length > 0 ||
              tempLog.data?.tags.length > 0
            ) {
              askToRemove().then(() => remove())
            } else {
              remove()
            }
          }}
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
            defaultIndex={slideIndex}
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
      {(slideIndex !== 0 || touched) && content[slideIndex] && (
        content[slideIndex].action || (
          slideIndex === content.length - 1 ? (
            <SlideAction type="save" onPress={save} />
          ) : (
            <SlideAction type="next" onPress={() => _carousel.current.next()} />
          )
        )
      )}
    </View>
  )
}
