import { DATE_FORMAT } from '@/constants/Config';
import { askToCancel, askToDisableFeedbackStep, askToDisableStep, askToRemove } from '@/helpers/prompts';
import { useAnalytics } from '@/hooks/useAnalytics';
import useColors from '@/hooks/useColors';
import { LogItem, useLogState, useLogUpdater } from '@/hooks/useLogs';
import { IQuestion, useQuestioner } from '@/hooks/useQuestioner';
import { useSettings } from '@/hooks/useSettings';
import { TagReference } from '@/hooks/useTags';
import { useTemporaryLog } from '@/hooks/useTemporaryLog';
import { useNavigation } from '@react-navigation/native';
import dayjs from 'dayjs';
import { ReactElement, useEffect, useRef, useState } from 'react';
import { Dimensions, Keyboard, Platform, Text, View } from 'react-native';
import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { v4 as uuidv4 } from "uuid";
import { SlideAction } from './components/SlideAction';
import { SlideHeader } from './components/SlideHeader';
import { Stepper } from './components/Stepper';
import { LoggerStep } from './config';
import { SlideFeedback } from './slides/SlideFeedback';
import { SlideMessage } from './slides/SlideMessage';
import { SlideMood } from './slides/SlideMood';
import { SlideReminder } from './slides/SlideReminder';
import { SlideTags } from './slides/SlideTags';

const EMOTIONS_INDEX_MAPPING = {
  extremely_bad: 0,
  very_bad: 1,
  bad: 1,
  neutral: 2,
  good: 3,
  very_good: 3,
  extremely_good: 4,
}

const getAvailableSteps = ({
  isEditing,
  question,
}: {
  isEditing: boolean;
  question: IQuestion | null
}) => {
  const { hasStep, settings } = useSettings();
  const logState = useLogState();

  const slides: LoggerStep[] = [
    'rating'
  ]

  // if (hasStep('emotions')) slides.push('emotions')
  if (hasStep('tags')) slides.push('tags')
  if (hasStep('message')) slides.push('message')

  if (
    logState.items.length === 1 &&
    !settings.reminderEnabled &&
    !isEditing
  ) {
    slides.push('reminder')
  }

  if (
    logState.items.length >= 3 &&
    question !== null &&
    !isEditing &&
    hasStep('feedback')
  ) {
    slides.push('feedback')
  }

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

  return (
    <Logger
      initialItem={initialItem}
      initialStep={initialStep}
      mode="edit"
    />
  )
}

export const LoggerCreate = ({
  dateTime,
  initialStep,
}: {
  dateTime: string
  initialStep?: LoggerStep
}) => {
  const _id = useRef(uuidv4())
  const createdAt = useRef(dayjs().toISOString())

  const initialItem = {
    id: _id.current,
    date: dateTime ? dayjs(dateTime).format(DATE_FORMAT) : dayjs().format(DATE_FORMAT),
    dateTime: dateTime,
    rating: null,
    message: '',
    emotions: [],
    tags: [],
    createdAt: createdAt.current,
  }

  return (
    <Logger
      initialItem={initialItem}
      initialStep={initialStep}
      mode="create"
    />
  )
}

export const Logger = ({
  initialItem,
  initialStep,
  mode,
}: {
  initialItem: Omit<LogItem, 'rating'> & {
    rating: LogItem['rating'] | null
  },
  initialStep?: LoggerStep;
  mode: 'create' | 'edit'
}) => {
  const navigation = useNavigation();
  const colors = useColors()
  const analytics = useAnalytics()
  const insets = useSafeAreaInsets();
  const questioner = useQuestioner()

  const logUpdater = useLogUpdater()

  const { toggleStep } = useSettings()

  const tempLog = useTemporaryLog(initialItem);

  const texAreaRef = useRef<any>(null);
  const isEditing = mode === 'edit'
  // const showDisable = logState.items.length <= 3 && !isEditing;
  const showDisable = false;

  const [touched, setTouched] = useState(false)
  const [question, setQuestion] = useState<IQuestion | null>(null);

  const avaliableSteps = getAvailableSteps({
    isEditing,
    question
  })

  const indexFound = avaliableSteps.findIndex(slide => slide === initialStep)
  const initialIndex = indexFound !== -1 ? indexFound : 0
  const [slideIndex, setSlideIndex] = useState(initialIndex)

  useEffect(() => {
    questioner.getQuestion().then(setQuestion)
  }, [])

  const close = async () => {
    tempLog.reset()
    navigation.goBack();
  }

  const save = () => {
    const eventData = {
      date: tempLog?.data?.date,
      dateTime: tempLog?.data?.dateTime,
      messageLength: tempLog?.data?.message.length,
      rating: tempLog?.data?.rating,
      tagsCount: tempLog?.data?.tags.length,
    }

    if (tempLog.data.rating === null) {
      tempLog.data.rating = 'neutral'
    }

    analytics.track('log_saved', eventData)

    if (mode === 'edit') {
      analytics.track('log_changed', eventData)
      logUpdater.editLog(tempLog.data as LogItem)
    } else {
      analytics.track('log_created', eventData)
      logUpdater.addLog(tempLog.data as LogItem)
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
      save()
    } else {
      if (_carousel.current) _carousel.current.next()
    }
  }

  const [shouldSave, setShouldSave] = useState(false)

  useEffect(() => {
    if (shouldSave) {
      save()
    }
  }, [tempLog.data])

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
              setShouldSave(true)
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
        type={slideIndex !== 0 || touched || mode === 'edit' ? 'next' : 'hidden'}
        onPress={next}
      />
    )
  })

  // if (avaliableSteps.includes('emotions')) {
  //   content.push({
  //     key: 'emotions',
  //     slide: (
  //       <SlideEmotions
  //         defaultIndex={EMOTIONS_INDEX_MAPPING[tempLog.data.rating || 'neutral']}
  //         onChange={(emotions: Emotion[]) => {
  //           tempLog.update({ emotions: emotions.map(emotion => emotion.key) })
  //         }}
  //         onDisableStep={() => {
  //           askToDisableStep().then(() => {
  //             toggleStep('emotions')
  //             next()
  //           })
  //         }}
  //       />
  //     ),
  //   })
  // }

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

  if (avaliableSteps.includes('feedback')) {
    content.push({
      key: 'feedback',
      slide: (
        <SlideFeedback
          question={question!}
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

    if (index === messageSlideIndex && hasMessageSlide) {
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
                  _carousel.current.scrollTo({ index, animated: true })
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