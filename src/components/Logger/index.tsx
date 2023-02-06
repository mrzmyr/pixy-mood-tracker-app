import { DATE_FORMAT } from '@/constants/Config';
import { askToCancel, askToDisableFeedbackStep, askToDisableStep, askToRemove } from '@/helpers/prompts';
import { useAnalytics } from '@/hooks/useAnalytics';
import useColors from '@/hooks/useColors';
import { LogItem, useLogState, useLogUpdater } from '@/hooks/useLogs';
import { IQuestion, useQuestioner } from '@/hooks/useQuestioner';
import { useSettings } from '@/hooks/useSettings';
import { TemporaryLogState, useTemporaryLog } from '@/hooks/useTemporaryLog';
import { Emotion, TagReference } from '@/types';
import { useNavigation } from '@react-navigation/native';
import dayjs from 'dayjs';
import { ReactElement, useEffect, useRef, useState } from 'react';
import { Dimensions, Keyboard, Platform, Text, TextInput, View } from 'react-native';
import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { v4 as uuidv4 } from "uuid";
import { SlideAction } from './components/SlideAction';
import { SlideHeader } from './components/SlideHeader';
import { Stepper } from './components/Stepper';
import { LoggerStep } from './config';
import { SlideEmotions } from './slides/SlideEmotions';
import { SlideFeedback } from './slides/SlideFeedback';
import { SlideMessage } from './slides/SlideMessage';
import { SlideMood } from './slides/SlideMood';
import { SlideReminder } from './slides/SlideReminder';
import { SlideTags } from './slides/SlideTags';
import { SlideSleep } from './slides/SlideSleep';
import { StackActions } from '@react-navigation/native';

export type LoggerMode = 'create' | 'edit'

const EMOTIONS_INDEX_MAPPING = {
  extremely_bad: 0,
  very_bad: 1,
  bad: 1,
  neutral: 2,
  good: 3,
  very_good: 3,
  extremely_good: 4,
}

const getAvailableStepsForCreate = ({
  date,
  question,
}: {
  date: string;
  question: IQuestion | null;
}) => {
  const { hasStep, settings } = useSettings();
  const logState = useLogState();

  const slides: LoggerStep[] = [
    'rating'
  ]

  const itemsOnDate = logState.items.filter(item => dayjs(item.dateTime).isSame(dayjs(date), 'day'))
  const hasSleep = itemsOnDate.some(item => item.sleep?.quality !== null)

  if (hasStep('sleep') && !hasSleep) slides.push('sleep')
  if (hasStep('emotions')) slides.push('emotions')
  if (hasStep('tags')) slides.push('tags')
  if (hasStep('message')) slides.push('message')

  if (
    logState.items.length === 1 &&
    !settings.reminderEnabled
  ) {
    slides.push('reminder')
  }

  if (
    logState.items.length >= 3 &&
    question !== null &&
    hasStep('feedback')
  ) {
    slides.push('feedback')
  }

  return slides;
}

const getAvailableStepsForEdit = ({
  date,
  item,
}: {
  date: string;
  item: LogItem;
}) => {
  const { hasStep } = useSettings();
  const logState = useLogState();

  const slides: LoggerStep[] = [
    'rating'
  ]

  const itemsOnDate = logState.items.filter(item => dayjs(item.dateTime).isSame(dayjs(date), 'day'))
  const hasSleep = itemsOnDate.some(item => item.sleep?.quality !== null)

  if (item.sleep?.quality || (!hasSleep && hasStep('sleep'))) slides.push('sleep')
  if (hasStep('emotions') || item.emotions.length > 0) slides.push('emotions')
  if (hasStep('tags') || item.tags.length > 0) slides.push('tags')
  if (hasStep('message') || item.message.length > 0) slides.push('message')

  return slides;
}

export const LoggerEdit = ({
  id,
  initialStep,
}: {
  id: string
  initialStep?: LoggerStep
}) => {
  const logState = useLogState()
  const initialItem = logState?.items.find(item => item.id === id)

  if (initialItem === undefined) {
    return (
      <View>
        <Text>Log not found</Text>
      </View>
    )
  }

  const avaliableSteps = getAvailableStepsForEdit({
    date: dayjs(initialItem.dateTime).format(DATE_FORMAT),
    item: initialItem,
  })

  return (
    <Logger
      mode="edit"
      initialItem={initialItem}
      initialStep={initialStep}
      avaliableSteps={avaliableSteps}
    />
  )
}

export const LoggerCreate = ({
  dateTime,
  initialStep,
  avaliableSteps,
}: {
  dateTime: string
  initialStep?: LoggerStep
  avaliableSteps?: LoggerStep[]
}) => {
  const _id = useRef(uuidv4())
  const createdAt = useRef(dayjs().toISOString())
  const questioner = useQuestioner()

  const initialItem = {
    id: _id.current,
    date: dateTime ? dayjs(dateTime).format(DATE_FORMAT) : dayjs().format(DATE_FORMAT),
    dateTime: dateTime,
    rating: null,
    message: '',
    emotions: [],
    tags: [],
    sleep: {
      quality: null,
    },
    createdAt: createdAt.current,
  }

  avaliableSteps = avaliableSteps || getAvailableStepsForCreate({
    date: initialItem.date,
    question: questioner.question,
  })

  return (
    <Logger
      mode="create"
      initialItem={initialItem}
      initialStep={initialStep}
      avaliableSteps={avaliableSteps}
      question={questioner.question}
    />
  )
}

export const Logger = ({
  initialItem,
  initialStep,
  avaliableSteps,
  mode,
  question,
}: {
  initialItem: TemporaryLogState,
  initialStep?: LoggerStep;
  avaliableSteps: LoggerStep[];
  mode: LoggerMode
  question?: IQuestion | null
}) => {
  const navigation = useNavigation();
  const colors = useColors()
  const analytics = useAnalytics()
  const insets = useSafeAreaInsets();

  const logState = useLogState()
  const logUpdater = useLogUpdater()

  const { toggleStep } = useSettings()

  const tempLog = useTemporaryLog(initialItem);

  const texAreaRef = useRef<TextInput>(null)
  const isEditing = mode === 'edit'
  const showDisable = logState.items.length <= 3 && !isEditing;

  const [touched, setTouched] = useState(false)

  const indexFound = avaliableSteps.findIndex(slide => slide === initialStep)
  const initialIndex = indexFound !== -1 ? indexFound : 0
  const [slideIndex, setSlideIndex] = useState(initialIndex)

  const close = async () => {
    tempLog.reset()
    navigation.goBack();
  }

  const save = (data: TemporaryLogState) => {
    const eventData = {
      date: data?.date,
      dateTime: data?.dateTime,
      messageLength: data?.message.length,
      rating: data?.rating,
      tagsCount: data?.tags.length,
      emotions: data?.emotions,
      emotionsCount: data?.emotions.length,
    }

    if (data.rating === null) {
      analytics.track('log_saved_without_rating', eventData)
      data.rating = 'neutral'
    }

    analytics.track('log_saved', eventData)

    if (mode === 'edit') {
      analytics.track('log_changed', eventData)
      logUpdater.editLog(data as LogItem)
    } else {
      analytics.track('log_created', eventData)
      logUpdater.addLog(data as LogItem)

      const itemsOnDate = logState.items.filter(item => dayjs(item.dateTime).isSame(dayjs(data.dateTime), 'day'))

      if (itemsOnDate.length === 1) {
        navigation.dispatch(StackActions.popToTop());
        tempLog.reset()
        return;
      }
    }

    close()
  }

  const remove = () => {
    analytics.track('log_deleted')
    logUpdater.deleteLog(tempLog.data.id)
    close()
  }

  const cancel = () => {
    analytics.track('log_cancled')
    close()
  }

  const next = () => {
    if (slideIndex + 1 === content.length - 1) {
      Keyboard.dismiss()
    }

    if (slideIndex + 1 === content.length) {
      save(tempLog.data)
    } else {
      if (_carousel.current) _carousel.current.next()
    }
  }

  const content: {
    key: string;
    slide: ReactElement,
    action?: ReactElement,
  }[] = []

  content.push({
    key: 'rating',
    slide: (
      <SlideMood
        onChange={(rating) => {
          if (tempLog.data.rating !== rating) {
            if (content.length === 1) {
              save({
                ...tempLog.data,
                rating,
              })
            } else {
              next()
            }
          }
          tempLog.update({ rating })
        }}
      />
    ),
    action: (
      <SlideAction
        type={slideIndex !== 0 || touched || mode === 'edit' ? (content.length === 1 ? 'save' : 'next') : 'hidden'}
        onPress={next}
      />
    )
  })

  if (avaliableSteps.includes('sleep')) {
    content.push({
      key: 'sleep',
      slide: (
        <SlideSleep
          onChange={(value: LogItem['sleep']['quality']) => {
            if (tempLog.data.sleep.quality === value) {
              tempLog.update({
                sleep: {
                  ...tempLog.data.sleep,
                  quality: null
                }
              })
            } else {

              tempLog.update({
                sleep: {
                  ...tempLog.data.sleep,
                  quality: value
                }
              })
              next()
            }
          }}
          showDisable={showDisable}
          onDisableStep={() => {
            askToDisableStep().then(() => {
              toggleStep('sleep')
              next()
            })
          }}
        />
      ),
    })
  }

  if (avaliableSteps.includes('emotions')) {
    content.push({
      key: 'emotions',
      slide: (
        <View
          style={{
            paddingBottom: insets.bottom + 20,
            flex: 1,
          }}
        >
          <SlideEmotions
            defaultIndex={EMOTIONS_INDEX_MAPPING[tempLog.data.rating || 'neutral']}
            onChange={(emotions: Emotion[]) => {
              tempLog.update({ emotions: emotions.map(emotion => emotion.key) })
            }}
            showDisable={showDisable}
          />
        </View>
      ),
    })
  }

  if (avaliableSteps.includes('tags')) {
    content.push({
      key: 'tags',
      slide: (
        <SlideTags
          onChange={(tags: TagReference[]) => {
            tempLog.update({ tags })
          }}
          onDisableStep={() => {
            askToDisableStep().then(() => {
              toggleStep('tags')
              next()
            })
          }}
          showDisable={showDisable}
        />
      ),
    })
  }

  if (avaliableSteps.includes('message')) {
    content.push({
      key: 'message',
      slide: (
        <SlideMessage
          onChange={(message) => {
            tempLog.update({ message })
          }}
          onDisableStep={() => {
            askToDisableStep().then(() => {
              toggleStep('message')
              next()
            })
          }}
          ref={texAreaRef}
          showDisable={showDisable}
        />
      )
    })
  }

  if (avaliableSteps.includes('reminder')) {
    content.push({
      key: 'reminder',
      slide: (
        <SlideReminder
          onPress={next}
        />
      ),
      action: <SlideAction type="hidden" />
    })
  }

  if (avaliableSteps.includes('feedback') && !!question) {
    content.push({
      key: 'feedback',
      slide: (
        <SlideFeedback
          question={question}
          onPress={next}
          onDisableStep={() => {
            askToDisableFeedbackStep().then(() => {
              toggleStep('feedback')
              next()
            })
          }}
        />
      ),
      action: <SlideAction type="hidden" />
    })
  }

  const _carousel = useRef<ICarouselInstance>(null);

  const messageSlideIndex = content.findIndex(item => item.key === 'message')
  const hasMessageSlide = messageSlideIndex !== -1

  const isMounted = useRef(true)

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  const onScrollEnd = (index: number) => {
    Keyboard.dismiss()

    if (
      index === messageSlideIndex &&
      hasMessageSlide &&
      mode === 'create'
    ) {
      texAreaRef.current?.focus()
    }
  }

  useEffect(() => {
    if (isMounted.current) {
      onScrollEnd(slideIndex)
    }
  }, [slideIndex])

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
        }}
      >
        <View
          style={{
            paddingHorizontal: 20,
          }}
        >
          {content.length > 1 ? (
            <Stepper
              count={content.length}
              index={slideIndex}
              scrollTo={({ index }) => {
                if (_carousel.current) {
                  _carousel.current.scrollTo({ index, animated: false })
                }
                setSlideIndex(index)
              }}
            />
          ) : (
            <View style={{ height: 24 }} />
          )}
          <SlideHeader
            onBack={() => {
              _carousel.current?.prev()
            }}
            backVisible={slideIndex > 0}
            isDeleteable={isEditing}
            onClose={() => {
              if (tempLog.isDirty) {
                askToCancel().then(() => cancel()).catch(() => { })
              } else {
                cancel()
              }
            }}
            onDelete={() => {
              if (
                tempLog.data.message.length > 0 ||
                tempLog.data.tags.length > 0
              ) {
                askToRemove().then(() => remove())
              } else {
                remove()
              }
            }}
          />
        </View>
        <View
          style={{
            flex: 1,
            flexDirection: 'column',
          }}
        >
          <Carousel
            loop={false}
            width={Dimensions.get('window').width}
            ref={_carousel}
            data={content}
            defaultIndex={Math.min(initialIndex, content.length - 1)}
            onProgressChange={(relativeProgress, absoluteProgress) => {
              if (isMounted.current) {
                setSlideIndex(Math.round(absoluteProgress))
              }
            }}
            onScrollBegin={() => {
              setTouched(true)
            }}
            enabled={false}
            renderItem={({ index }) => content[index].slide}
            panGestureHandlerProps={{
              activeOffsetX: [-10, 10],
            }}
          />
        </View>
      </View>
      {
        content[slideIndex] &&
        (
          content[slideIndex].action || (
            slideIndex === content.length - 1 ? (
              <SlideAction type="save" onPress={next} />
            ) : (
              <SlideAction type="next" onPress={next} />
            )
          )
        )}
    </View>
  )
}