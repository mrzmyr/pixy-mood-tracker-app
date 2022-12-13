import { getLogEditMarginTop } from "@/helpers/responsive";
import { t } from "@/helpers/translation";
import useColors from "@/hooks/useColors";
import { LogItem, RATING_MAPPING, useLogState } from "@/hooks/useLogs";
import { useTemporaryLog } from "@/hooks/useTemporaryLog";
import { getAverageMood } from "@/lib/utils";
import dayjs, { Dayjs } from "dayjs";
import { forwardRef, useEffect, useRef, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { HelpCircle } from "react-native-feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DismissKeyboard from "../../DismisKeyboard";
import LinkButton from "../../LinkButton";
import TextArea from "../../TextArea";
import { SlideHeadline } from "../components/SlideHeadline";
import { Footer } from "./Footer";
import { Card } from '@/components/Card'

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

export const SlideMessage = forwardRef(({
  onChange,
  onDisableStep,
  showDisable,
}: {
  onChange: (text: LogItem['message']) => void
  onDisableStep: () => void
  showDisable: boolean
}, ref: any) => {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const tempLog = useTemporaryLog();
  const marginTop = getLogEditMarginTop()

  const placeholder = useRef(t(`log_modal_message_placeholder_${randomInt(1, 6)}`))
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

  const date = dayjs(tempLog.data.dateTime)
  const todayMoodValue = getMoodValueNow()
  const yesterdayMoodValue = getMoodValueYesterday(date)

  let questions: string[] = [
    placeholder.current,
  ]

  if (
    todayMoodValue !== null &&
    yesterdayMoodValue !== null
  ) {
    questions.push(t('log_messasge_hint_1', {
      word: todayMoodValue > yesterdayMoodValue ? t('up') : t('down'),
    }))
  }

  if (tempLog.data?.emotions?.length > 0) {
    questions.push(
      t('log_messasge_hint_2', {
        words: tempLog.data.emotions.slice(0, 5).map(emotion => t(`log_emotion_${emotion}`)).join(', ').toLowerCase(),
      })
    )
  }

  return (
    <>
      <DismissKeyboard>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{
            flex: 1,
          }}
        >
          <View style={{
            flex: 1,
            backgroundColor: colors.logBackground,
            width: '100%',
            position: 'relative',
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 8 + (shouldExpand ? 112 : 0),
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
                    setShowTips(!showTips)
                  }}
                  style={{
                    marginBottom: -12,
                    marginTop: -12,
                  }}
                >
                  <HelpCircle width={22} color={colors.text} />
                </LinkButton>
              </View>
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
              {showTips && questions.length > 0 && (
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
                    onClose={() => setShowTips(false)}
                    hasFeedback
                    analyticsId="log_message_hint"
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
        </KeyboardAvoidingView>
      </DismissKeyboard>
    </>
  )
})