import { useNavigation } from '@react-navigation/native';
import dayjs from 'dayjs';
import { v4 as uuid } from "uuid";
import { t } from 'i18n-js';
import { ReactElement, useEffect, useRef, useState } from 'react';
import { Dimensions, Keyboard, Platform, useColorScheme, View } from 'react-native';
import Carousel from 'react-native-reanimated-carousel';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DATE_FORMAT } from '../../constants/Config';
import { askToCancel, askToRemove } from '../../helpers/prompts';
import { useAnalytics } from '../../hooks/useAnalytics';
import { useAnonymizer } from '../../hooks/useAnonymizer';
import useColors from '../../hooks/useColors';
import { LogItem, useLogState, useLogUpdater } from '../../hooks/useLogs';
import { IQuestion, useQuestioner } from '../../hooks/useQuestioner';
import { useSettings } from '../../hooks/useSettings';
import { useTagsState } from '../../hooks/useTags';
import { useTemporaryLog } from '../../hooks/useTemporaryLog';
import { SlideAction } from './SlideAction';
import { SlideHeader } from './SlideHeader';
import { SlideNote } from './SlideNote';
import { SlideQuestion } from './SlideQuestion';
import { SlideRating } from './SlideRating';
import { SlideReminder } from './SlideReminder';
import { SlideTags } from './SlideTags';
import { Stepper } from './Stepper';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { v4 as uuidv4 } from "uuid";
import { getItemDateTitle } from '../../lib/utils';

const SLIDE_INDEX_MAPPING = {
  rating: 0,
  tags: 1,
  message: 2,
}

export const Logger = ({
  id,
  date,
  initialStep
}: {
  id?: LogItem['id']
  date?: string;
  initialStep?: keyof typeof SLIDE_INDEX_MAPPING;
}) => {
  const navigation = useNavigation();
  const { settings } = useSettings()
  const colors = useColors()
  const analytics = useAnalytics()
  const insets = useSafeAreaInsets();
  const { tags } = useTagsState()
  const questioner = useQuestioner()

  const logUpdater = useLogUpdater()
  const logState = useLogState()
  const tempLog = useTemporaryLog();
  const { anonymizeTag } = useAnonymizer()

  const existingLogItem: LogItem | null = id ? logState?.items.find(item => item.id === id) || null : null
  const defaultLogItem = {
    ...tempLog.data,
    id: uuidv4(),
    date: date || null,
    dateTime: date ? dayjs(date).hour(dayjs().hour()).minute(dayjs().minute()).toISOString() : null,
    createdAt: dayjs().toISOString(),
  }

  const isEditing = existingLogItem !== null;

  const [question, setQuestion] = useState<IQuestion | null>(null);

  useEffect(() => {
    if (existingLogItem !== null) {
      tempLog.set(existingLogItem)
    } else {
      tempLog.set(defaultLogItem)
    }
    questioner.getQuestion().then(setQuestion)
  }, [])

  useEffect(() => {
    if (tempLog.data.dateTime === null) return;

    // delete all tags that are not in the settings
    const settingTagIds = tags.map(tag => tag.id)
    const _tags = tempLog?.data?.tags?.filter(tag => settingTagIds.includes(tag.id))
    tempLog.set(tempLog => ({ ...tempLog, tags: _tags }))
  }, [JSON.stringify(tags)])

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
      tags: tempLog?.data?.tags.map(tag => anonymizeTag(tag)) || [],
      tagsCount: tempLog?.data?.tags.length,
    }

    if (tempLog?.data?.rating === null) {
      tempLog.data.rating = 'neutral'
    }

    analytics.track('log_saved', eventData)

    if (existingLogItem) {
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

  const setRating = (rating: LogItem['rating']) => {
    analytics.track('log_rating_changed', {
      label: rating
    })
    tempLog.set((logItem) => ({ ...logItem, rating }))
  }

  const setMessage = (message: LogItem['message']) => {
    tempLog.set(logItem => ({ ...logItem, message }))
  }

  const setTags = (tags: LogItem['tags']) => {
    analytics.track('log_tags_changed', {
      tags: tags?.map(tag => anonymizeTag(tag)) || [],
    })
    tempLog.set(logItem => ({ ...logItem, tags }))
  }

  const initialIndex = SLIDE_INDEX_MAPPING[initialStep || 'rating']

  const _carousel = useRef(null);
  const [slideIndex, setSlideIndex] = useState(initialIndex)
  const [touched, setTouched] = useState(false)

  const next = () => {
    if (slideIndex + 1 === content.length - 1) {
      Keyboard.dismiss()
    }

    if (slideIndex + 1 === content.length) {
      save()
    } else {
      _carousel.current.next()
    }
  }

  const content: {
    slide: ReactElement,
    action?: ReactElement,
  }[] = [{
    slide: (
      <SlideRating
        onChange={(rating) => {
          if (tempLog.data.rating !== rating) {
            setTimeout(() => _carousel.current.next(), 200)
          }
          setRating(rating)
        }}
      />
    ),
  }, {
    slide: <SlideTags onChange={setTags} />,
  }, {
    slide: <SlideNote onChange={setMessage} />,
  }
    ]

  if (
    logState.items.length === 1 &&
    !settings.reminderEnabled &&
    !isEditing
  ) {
    content.push({
      slide: (
        <SlideReminder
          onPress={next}
        />
      ),
      action: <SlideAction type="hidden" />
    })
  }

  if (
    question !== null &&
    !isEditing
  ) {
    content.push({
      slide: (
        <SlideQuestion
          question={question}
          onPress={next}
        />
      ),
      action: <SlideAction type="hidden" />
    })
  }

  const isMounted = useRef(true)

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  const onScrollEnd = () => {
    Keyboard.dismiss()
  }

  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

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
            setSlideIndex(index)
          }}
        />
        <SlideHeader
          title={getItemDateTitle(tempLog.data.dateTime!)}
          onPressTitle={() => {
            setDatePickerVisibility(true)
          }}
          isDeleteable={isEditing}
          onClose={() => {
            const tempLogHasChanges = tempLog.hasChanged()
            const existingLogItemHasChanges = existingLogItem ? tempLog.hasDifference(existingLogItem) : false

            if (
              !existingLogItem && tempLogHasChanges ||
              !!existingLogItem && existingLogItemHasChanges
            ) {
              askToCancel().then(() => cancel()).catch(() => { })
            } else {
              cancel()
            }
          }}
          onDelete={() => {
            if (
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
            defaultIndex={Math.min(initialIndex, content.length - 1)}
            onProgressChange={(relativeProgress, absoluteProgress) => {
              if (isMounted.current) {
                setSlideIndex(Math.round(absoluteProgress))
              }
            }}
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
            <SlideAction type="save" onPress={next} />
          ) : (
            <SlideAction type="next" onPress={next} />
          )
        )
      )}
      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        date={tempLog.data.dateTime ? new Date(tempLog.data.dateTime) : new Date()}
        mode="datetime"
        onConfirm={date => {
          setDatePickerVisibility(false)
          tempLog.set(log => ({
            ...log,
            date: dayjs(date).format(DATE_FORMAT),
            dateTime: dayjs(date).toISOString(),
          }))
          navigation.setParams({
            date: dayjs(date).format(DATE_FORMAT),
          })
        }}
        onCancel={() => setDatePickerVisibility(false)}
      />
    </View>
  )
}