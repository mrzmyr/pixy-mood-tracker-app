import { t } from "@/helpers/translation";
import { BotEventData, BotEventType, BotMessage } from "@/hooks/useBot";
import { RATING_MAPPING, SLEEP_QUALITY_MAPPING, useLogState } from '@/hooks/useLogs';
import { SettingsState, useSettings } from "@/hooks/useSettings";
import { useTagsState } from '@/hooks/useTags';
import { TemporaryLogValue } from '@/hooks/useTemporaryLog';
import { wait } from "@/lib/utils";
import { Emotion } from "@/types";
import { NavigationProp } from '@react-navigation/native';
import dayjs from "dayjs";
import { useState } from 'react';

// export const THINKING_DELAY = 0;
// export const ANSWER_DELAY = 0;
// export const SHOW_ANSWERS_DELAY = 0;
export const THINKING_DELAY = 500;
export const ANSWER_DELAY = 1000;
export const SHOW_ANSWERS_DELAY = 500;

export interface BotAnswer {
  type: 'button_primary' | 'button_secondary' | 'rating' | 'emotions' | 'text' | 'sleep_quality';
  buttonText?: string;
  messageText?: string | ((data: any) => string);
  action: (options: {
    next: (options?: { messageText: string }) => void;
    post: (message: BotMessage) => void;
    trigger: (event: BotEventType, data?: BotEventData) => void;
    setThinking: (thinking: boolean) => void;
    setAnswers: (answers: BotAnswer[]) => void;
    save: () => void;
    close: () => void;
    finish: () => void;
    tempLog: TemporaryLogValue;
    questions: BotQuestion[];
    setQuestions: (questions: BotQuestion[]) => void;
    navigation: NavigationProp<Record<string, object | undefined>, string, any, any, any>;
    data?: any;
  }) => void;
}

export interface BotQuestion {
  id: string;
  text: string;
  answers: BotAnswer[];
}

const getEmotionsDetailsQuestion = ({
  emotions,
}: {
  emotions: Emotion[];
}): BotQuestion => {
  return {
    id: 'emotions_details',
    text: `According to Harvard Health, writing about your emotions can help you cope with stress, anxiety, and depression.
    
Do you want to reflect on why you felt this way?`,
    answers: [{
      type: 'button_primary',
      buttonText: 'Yes',
      action: ({ next, setQuestions, questions }) => {
        const emotionQuestions = emotions.map(emotion => {
          return getEmotionQuestion(emotion)
        })

        const index = questions.findIndex(question => question.id === 'emotions_details')

        setQuestions([
          ...questions.slice(0, index + 1),
          ...emotionQuestions,
          ...questions.slice(index + 1),
        ])

        next({
          messageText: 'Yes',
        })
      }
    }, {
      type: 'button_secondary',
      buttonText: 'No',
      action: ({ next }) => {
        next({
          messageText: 'No',
        })
      }
    }, {
      type: 'button_secondary',
      buttonText: `I'm done tracking`,
      action: ({ post, finish }) => {
        post({
          text: `I'm done tracking`,
          author: 'user',
        })

        finish()
      }
    }]
  }
}

const getEmotionQuestion = (emotion: Emotion): BotQuestion => {
  return {
    id: `emotion_${emotion.key}`,
    text: `What made you feel ${t(`log_emotion_${emotion.key}`).toLowerCase()}?`,
    answers: [{
      type: 'text',
      action: ({ data, post, next, tempLog }) => {
        if (data.text === '') {
          post({
            text: 'I leave this empty for now.',
            author: 'user',
          })
        } else {
          tempLog.update({
            message: tempLog.data.message + `${t(`log_emotion_${emotion.key}`)}: ${data.text}\n`,
          })

          post({
            text: data.text,
            author: 'user',
          })
        }

        next()
      }
    }]
  }
}

const getInitialQuestions = ({
  logState,
  tagsState,
  settings,
}: {
  logState: ReturnType<typeof useLogState>,
  tagsState: ReturnType<typeof useTagsState>,
  settings: SettingsState,
}): BotQuestion[] => {

  const _questions: BotQuestion[] = []

  _questions.push({
    id: 'introduction',
    text: `Do you feel ready to give some details about how you felt?`,
    answers: [{
      type: 'button_primary',
      buttonText: "Let's go",
      action: ({ next }) => next({
        messageText: 'Ok, let\'s start',
      })
    }],
  })

  _questions.push({
    id: 'rating',
    text: "So, how was your day until now?",
    answers: [{
      type: 'rating',
      action: async ({ next, data, post, trigger, tempLog, setAnswers, setThinking }) => {
        tempLog.update({
          rating: data.rating,
        })

        setAnswers([])

        post({
          text: `I'd say it was ${t(data.rating).toLowerCase()}`,
          author: 'user',
        })

        await wait(THINKING_DELAY)
        setThinking(true)
        await wait(ANSWER_DELAY)
        setThinking(false)

        if (RATING_MAPPING[data.rating] > 3) {
          post({
            text: `I'm glad to hear something went positively 😌`,
            author: 'bot',
          })
          return next()
        }
        if (RATING_MAPPING[data.rating] < 3) {
          post({
            text: `It sounds like today was a tough one. You're not alone and I'm here to support you.`,
            author: 'bot',
          })
          await wait(THINKING_DELAY)
          return next()
        }

        post({
          text: `I see, so it was an average day `,
          author: 'bot',
        })
        next()
      }
    }],
  })

  const itemsOnDate = logState.items.filter(item => dayjs(item.dateTime).isSame(dayjs(), 'day'))
  const hasSleep = itemsOnDate.some(item => item.sleep?.quality !== null)

  if (settings.steps.includes('sleep') && !hasSleep) {
    _questions.push({
      id: 'sleep',
      text: "How did you sleep?",
      answers: [{
        type: 'sleep_quality',
        action: async ({ next, data, post, tempLog, setAnswers, setThinking }) => {
          tempLog.update({
            sleep: {
              quality: data.quality,
            },
          })

          setAnswers([])

          post({
            text: `I'd say it was ${t(data.quality).toLowerCase()}`,
            author: 'user',
          })

          await wait(THINKING_DELAY)
          setThinking(true)
          await wait(ANSWER_DELAY)
          setThinking(false)

          if (SLEEP_QUALITY_MAPPING[data.quality] > 2) {
            post({
              text: `I'm glad to hear you had a good sleep 😌.`,
              author: 'bot',
            })
            return next()
          }
          if (SLEEP_QUALITY_MAPPING[data.quality] < 2) {
            post({
              text: `I'm sorry to hear that. I hope you'll get a better sleep tonight.`,
              author: 'bot',
            })
            return next()
          }

          post({
            text: `I see, so it was an average sleep `,
            author: 'bot',
          })
          next()
        }
      }],
    })
  }

  if (settings.steps.includes('emotions')) {
    _questions.push({
      id: 'emotions',
      text: "Do you want to add emotions you felt?",
      answers: [{
        type: 'button_primary',
        buttonText: "Add emotions",
        action: ({ next, tempLog, questions, setQuestions, navigation }) => {
          navigation.navigate('BotLoggerEmotions', {
            onDone: (emotions) => {
              navigation.goBack()

              if (emotions.length === 0) {
                next({
                  messageText: "I don't want to add emotions"
                })
                return
              }

              tempLog.update({ emotions: emotions.map(emotion => emotion.key) })

              const index = questions.findIndex(question => question.id === 'emotions')

              setQuestions([
                ...questions.slice(0, index + 1),
                getEmotionsDetailsQuestion({
                  emotions,
                }),
                ...questions.slice(index + 1),
              ])

              next({
                messageText: `I felt ${emotions.map(emotion => t(`log_emotion_${emotion.key}`)).join(', ').toLowerCase()}`
              })
            }
          })
        }
      }, {
        type: 'button_secondary',
        buttonText: "Skip",
        action: ({ next }) => next({
          messageText: "Skip"
        })
      }, {
        type: 'button_secondary',
        buttonText: `I'm done tracking`,
        action: ({ post, finish }) => {
          post({
            text: `I'm done tracking`,
            author: 'user',
          })

          finish()
        }
      }],
    })
  }

  if (settings.steps.includes('tags')) {
    _questions.push({
      id: 'tags',
      text: "Do you want to add some tags?",
      answers: [{
        type: 'button_primary',
        buttonText: "Add tags",
        action: ({ next, navigation, tempLog }) => {
          navigation.navigate('BotLoggerTags', {
            onDone: (tags) => {
              navigation.goBack()

              if (tags.length === 0) {
                next({
                  messageText: "I don't want to add tags"
                })
                return
              }

              tempLog.update({ tags })
              const fullTags = tags.map(tag => tagsState.tags.find(t => t.id === tag.id))

              next({
                messageText: `Yes, let's add ${fullTags.map(tag => tag?.title).join(', ')}`
              })
            }
          })
        }
      }, {
        type: 'button_secondary',
        buttonText: `I'm done tracking`,
        action: ({ post, finish }) => {
          post({
            text: `I'm done tracking`,
            author: 'user',
          })

          finish()
        }
      }],
    })
  }

  _questions.push({
    id: 'action_close',
    text: "Awesome. See you later!",
    answers: [{
      type: 'button_primary',
      buttonText: "Close",
      action: ({ trigger }) => {
        trigger('save')
        trigger('close')
      }
    }],
  })

  return _questions
}

export const useBotQuestions = () => {
  const logState = useLogState()
  const tagsState = useTagsState()
  const { settings } = useSettings()

  return useState<BotQuestion[]>(getInitialQuestions({
    logState,
    tagsState,
    settings,
  }))
}