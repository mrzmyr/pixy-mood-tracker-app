import { useFeedback } from './../../hooks/useFeedback';
import { t } from "@/helpers/translation";
import { BotEventData, BotEventType, BotMessage } from "@/hooks/useBot";
import { RATING_MAPPING, SLEEP_QUALITY_MAPPING, useLogState } from '@/hooks/useLogs';
import { SettingsState, useSettings } from "@/hooks/useSettings";
import { Tag, useTagsState } from '@/hooks/useTags';
import { TemporaryLogValue } from '@/hooks/useTemporaryLog';
import { wait } from "@/lib/utils";
import { Emotion } from "@/types";
import { NavigationProp } from '@react-navigation/native';
import dayjs from "dayjs";
import { useState } from 'react';

// export const THINKING_DELAY = 0;
// export const ANSWER_DELAY = 0;
// export const SHOW_ANSWERS_DELAY = 0;
export const THINKING_DELAY = 200;
export const ANSWER_DELAY = 500;
export const SHOW_ANSWERS_DELAY = 200;

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
    text: t('bot_question_emotion_details_text'),
    answers: [{
      type: 'button_primary',
      buttonText: t('bot_question_emotion_details_button_yes'),
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
          messageText: t('bot_question_emotion_details_answer_yes'),
        })
      }
    }, {
      type: 'button_secondary',
      buttonText: t('bot_question_emotion_details_button_no'),
      action: ({ next }) => {
        next({
          messageText: t('bot_question_emotion_details_answer_no'),
        })
      }
    }, {
      type: 'button_secondary',
      buttonText: t('bot_question_emotion_details_button_done'),
      action: ({ post, finish }) => {
        post({
          text: t('bot_question_emotion_details_answer_done'),
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
    text: t('bot_question_emotion_prefix', { emotion: t(`log_emotion_${emotion.key}`).toLowerCase() }),
    answers: [{
      type: 'text',
      action: ({ data, post, next, tempLog }) => {
        if (data.text === '') {
          post({
            text: t('bot_question_emotion_answer_empty'),
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
  feedback,
  logState,
  tagsState,
  settings,
}: {
  feedback: ReturnType<typeof useFeedback>,
  logState: ReturnType<typeof useLogState>,
  tagsState: ReturnType<typeof useTagsState>,
  settings: SettingsState,
}): BotQuestion[] => {

  const _questions: BotQuestion[] = []

  _questions.push({
    id: 'introduction',
    text: t('bot_question_introduction_text'),
    answers: [{
      type: 'button_primary',
      buttonText: t('bot_question_introduction_button_yes'),
      action: ({ next }) => next({
        messageText: t('bot_question_introduction_answer_yes'),
      })
    }],
  })

  _questions.push({
    id: 'rating',
    text: t('bot_question_rating_text'),
    answers: [{
      type: 'rating',
      action: async ({ next, data, post, tempLog, setAnswers, setThinking }) => {
        tempLog.update({
          rating: data.rating,
        })

        setAnswers([])

        post({
          text: t('bot_question_rating_answer_prefix', {
            rating: t(data.rating).toLowerCase(),
          }),
          author: 'user',
        })

        await wait(THINKING_DELAY)
        setThinking(true)
        await wait(ANSWER_DELAY)
        setThinking(false)

        if (RATING_MAPPING[data.rating] > 3) {
          post({
            text: t('bot_question_rating_response_positive'),
            author: 'bot',
          })
          return next()
        }
        if (RATING_MAPPING[data.rating] < 3) {
          post({
            text: t('bot_question_rating_response_negative'),
            author: 'bot',
          })
          await wait(THINKING_DELAY)
          return next()
        }

        post({
          text: t('bot_question_rating_response_neutral'),
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
      text: t('bot_question_sleep_quality_text'),
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
            text: t('bot_question_sleep_quality_answer_prefix', {
              quality: t(data.quality).toLowerCase(),
            }),
            author: 'user',
          })

          await wait(THINKING_DELAY)
          setThinking(true)
          await wait(ANSWER_DELAY)
          setThinking(false)

          if (SLEEP_QUALITY_MAPPING[data.quality] > 2) {
            post({
              text: t('bot_question_sleep_quality_response_positive'),
              author: 'bot',
            })
            return next()
          }
          if (SLEEP_QUALITY_MAPPING[data.quality] < 2) {
            post({
              text: t('bot_question_sleep_quality_response_negative'),
              author: 'bot',
            })
            return next()
          }

          post({
            text: t('bot_question_sleep_quality_response_neutral'),
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
      text: t('bot_question_emotions_text'),
      answers: [{
        type: 'button_primary',
        buttonText: t('bot_question_emotions_button_yes'),
        action: ({ next, tempLog, questions, setQuestions, navigation }) => {
          navigation.navigate('BotLoggerEmotions', {
            onDone: (emotions) => {
              navigation.goBack()

              if (emotions.length === 0) {
                next({
                  messageText: t('bot_question_emotions_answer_empty'),
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
                messageText: t('bot_question_emotions_answer_emotions', { emotions: `${emotions.map(emotion => t(`log_emotion_${emotion.key}`)).join(', ').toLowerCase()}` }),
              })
            }
          })
        }
      }, {
        type: 'button_secondary',
        buttonText: t('bot_question_emotions_button_skip'),
        action: ({ next }) => next({
          messageText: t('bot_question_emotions_answer_skip'),
        })
      }, {
        type: 'button_secondary',
        buttonText: t('bot_question_emotions_button_done'),
        action: ({ post, finish }) => {
          post({
            text: t('bot_question_emotions_answer_done'),
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
      text: t('bot_question_tags_text'),
      answers: [{
        type: 'button_primary',
        buttonText: t('bot_question_tags_button_yes'),
        action: ({ next, navigation, tempLog }) => {
          navigation.navigate('BotLoggerTags', {
            onDone: (tags: Tag[]) => {
              navigation.goBack()

              if (tags.length === 0) {
                next({
                  messageText: t('bot_question_tags_answer_empty'),
                })
                return
              }

              tempLog.update({ tags })
              const fullTags = tags.map(tag => tagsState.tags.find(t => t.id === tag.id))

              next({
                messageText: t('bot_question_tags_answer_tags', { tags: `${fullTags.map(tag => tag?.title).join(', ')}` }),
              })
            }
          })
        }
      }, {
        type: 'button_secondary',
        buttonText: t('bot_question_tags_button_skip'),
        action: ({ next }) => next({
          messageText: t('bot_question_tags_answer_skip'),
        })
      }, {
        type: 'button_secondary',
        buttonText: t('bot_question_tags_button_done'),
        action: ({ post, finish }) => {
          post({
            text: t('bot_question_tags_answer_done'),
            author: 'user',
          })

          finish()
        }
      }],
    })
  }

  if (settings.steps.includes('message')) {
    _questions.push({
      id: 'message',
      text: t('bot_question_message_text'),
      answers: [{
        type: 'text',
        action: ({ next, data, tempLog }) => {
          if (!data.text) {
            return next({
              messageText: t('bot_question_message_answer_empty'),
            })
          }

          tempLog.update({
            message: tempLog.data.message + '\n' + data.text,
          })

          next({
            messageText: t('bot_question_message_answer_text', { text: data.text }),
          })
        }
      }],
    })
  }


  _questions.push({
    id: 'custom_feedback',
    text: t('bot_question_custom_feedback_text') + ' 😌',
    answers: [{
      type: 'text',
      action: async ({ next, data, post, setThinking }) => {
        if (!data.text) {
          return next({
            messageText: t('bot_question_custom_feedback_answer_empty'),
          })
        }

        setThinking(true)

        feedback
          .send({
            type: 'custom',
            message: data.text,
            source: "bot",
            onOk: () => { },
            onCancel: () => { },
          })
          .finally(() => {
            setThinking(false)

            post({
              text: t('bot_question_custom_feedback_answer_text', { text: data.text }),
              author: 'user',
            })

            post({
              text: t('bot_question_custom_feedback_response') + ' 🙏',
              author: 'bot',
            })

            next()
          });
      }
    }],
  })

  _questions.push({
    id: 'action_close',
    text: t('bot_text_outro') + ' 🤗',
    answers: [{
      type: 'button_primary',
      buttonText: t('bot_button_close'),
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

  const feedback = useFeedback()

  return useState<BotQuestion[]>(getInitialQuestions({
    feedback,
    logState,
    tagsState,
    settings,
  }))
}