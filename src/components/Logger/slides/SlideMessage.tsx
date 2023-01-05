import { Card } from '@/components/Card';
import { getLogEditMarginTop } from "@/helpers/responsive";
import { language, t } from "@/helpers/translation";
import { useAnalytics } from "@/hooks/useAnalytics";
import useColors from "@/hooks/useColors";
import { LogItem, RATING_MAPPING, useLogState } from "@/hooks/useLogs";
import { useTemporaryLog } from "@/hooks/useTemporaryLog";
import { getAverageMood } from "@/lib/utils";
import dayjs, { Dayjs } from "dayjs";
import _ from "lodash";
import { forwardRef, useEffect, useRef, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { HelpCircle } from "react-native-feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DismissKeyboard from "../../DismisKeyboard";
import LinkButton from "../../LinkButton";
import TextArea from "../../TextArea";
import { SlideHeadline } from "../components/SlideHeadline";
import { EMOTIONS } from "../config";
import { Footer } from "./Footer";

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

const MAX_LENGTH = 10 * 1000;

const getMoodValueYesterday = (today: Dayjs): number | null => {
  const logState = useLogState()

  if (logState.items.length === 0) {
    return null
  }

  const yesterday = today.subtract(1, 'day')
  const itemsYesterday = logState.items.filter(item => dayjs(item.dateTime).isSame(yesterday, 'day'))
  const yesterdayAverageMood = getAverageMood(itemsYesterday)

  if (yesterdayAverageMood === null) {
    return null
  }

  return RATING_MAPPING[yesterdayAverageMood]
}

const getMoodValueNow = (): number | null => {
  const tempLog = useTemporaryLog();

  if (tempLog?.data?.rating === null) {
    return null
  }

  return RATING_MAPPING[tempLog?.data?.rating]
}

const Tips = ({
  onClose
}: {
  onClose: () => void
}) => {
  const colors = useColors();
  const tempLog = useTemporaryLog();

  const placeholder = useRef(t(`log_modal_message_placeholder_${randomInt(1, 6)}`))
  const date = dayjs(tempLog.data.dateTime)
  const todayMoodValue = getMoodValueNow()
  const yesterdayMoodValue = getMoodValueYesterday(date)

  let questions: string[] = []

  if (
    todayMoodValue !== null &&
    yesterdayMoodValue !== null
  ) {
    questions.push(t('log_messasge_hint_1', {
      word: todayMoodValue > yesterdayMoodValue ? t('up') : t('down'),
    }))
  }

  const fullEmotions = tempLog.data?.emotions?.map(key => EMOTIONS.find(e => e.key === key)) || []
  const sortedEmotions = _.sortBy(fullEmotions, (emotion) => {
    return {
      'very_good': 2,
      'good': 1,
      'neutral': 0,
      'bad': -1,
      'very_bad': -2,
    }[emotion!.category]
  })

  if (sortedEmotions.length > 0) {
    sortedEmotions.slice(0, 5).forEach(emotion => {
      let description = t(`log_emotion_${emotion?.key}_description`).toLowerCase()

      if (language === 'de') {
        description = description.charAt(0).toUpperCase() + description.slice(1)
      }

      questions.push(t(`log_messasge_hint_2`, {
        description,
      }))
    })
  }

  if (questions.length < 2) {
    questions.push(placeholder.current)
  }

  return (
    <View
      style={{
      }}
    >
      <Card
        title={t('log_message_hint_title')}
        style={{
          backgroundColor: colors.logCardBackground,
          marginTop: 16,
        }}
        onClose={onClose}
        hasFeedback
        analyticsId="log_message_hint"
        analyticsData={{
          questions: questions,
        }}
      >
        {questions.map((q, index) => (
          <Text
            key={`q-${index}`}
            style={{
              fontSize: 17,
              color: colors.textSecondary,
              marginTop: index === 0 ? 0 : 8,
            }}
          >{q}</Text>
        ))}
      </Card>
    </View>
  )
}

export const SlideMessage = forwardRef(({
  onChange,
  onDisableStep,
  showDisable,
}: {
  onChange: (text: LogItem['message']) => void
  onDisableStep: () => void
  showDisable: boolean
}, ref: any) => {
  const analytics = useAnalytics();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const tempLog = useTemporaryLog();
  const marginTop = getLogEditMarginTop()

  const [showTips, setShowTips] = useState(false)

  const [shouldExpand, setShouldExpand] = useState(false);

  useEffect(() => {
    const r1 = Keyboard.addListener('keyboardWillShow', () => setShouldExpand(true))
    const r2 = Keyboard.addListener('keyboardWillHide', () => setShouldExpand(false))

    return () => {
      r1.remove()
      r2.remove()
    }
  }, [])

  return (
    <KeyboardAvoidingView
      keyboardVerticalOffset={marginTop + insets.top + 16}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{
        flex: 1
      }}
    >
      <DismissKeyboard>
        <View style={{
          flex: 1,
          justifyContent: "space-around"
        }}>
          <View style={{
            flex: 1,
            backgroundColor: colors.logBackground,
            width: '100%',
            position: 'relative',
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 16 + (shouldExpand ? 24 : 0),
          }}>

            <View
              style={{
                flex: 1,
                marginTop: marginTop,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  width: "100%",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <SlideHeadline>{t('log_note_question')}</SlideHeadline>
                <LinkButton
                  onPress={() => {
                    analytics.track('log_message_tips_open')
                    setShowTips(!showTips)
                  }}
                  style={{
                    marginBottom: -12,
                    marginTop: -12,
                    marginRight: 4,
                  }}
                >
                  <HelpCircle width={22} color={colors.textSecondary} />
                </LinkButton>
              </View>
              {showTips && (
                <Tips
                  onClose={() => {
                    setShowTips(false)
                  }}
                />
              )}
              {!showTips && (
                <View
                  style={{
                    flexDirection: "column",
                    width: "100%",
                    marginTop: 16,
                    flex: 1,
                  }}
                >
                  <TextArea
                    ref={ref}
                    value={tempLog?.data?.message}
                    onChange={onChange}
                    maxLength={MAX_LENGTH}
                    style={{
                      flex: 1,
                      marginBottom: 0,
                    }}
                  />
                </View>
              )}
            </View>
            <Footer>
              {showDisable && (
                <LinkButton
                  type="secondary"
                  onPress={onDisableStep}
                  style={{
                    fontWeight: '400',
                  }}
                >{t('log_message_disable')}</LinkButton>
              )}
            </Footer>
          </View>
        </View>
      </DismissKeyboard>
    </KeyboardAvoidingView>
  )
})
