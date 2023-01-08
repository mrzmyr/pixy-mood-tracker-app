import { useTagsState } from '@/hooks/useTags';
import { useEffect } from 'react';
import { t } from "@/helpers/translation";
import { BotEventData, BotEventType, BotMessage } from "@/hooks/useBot";
import { RATING_MAPPING } from '@/hooks/useLogs';
import { SettingsState, useSettings } from "@/hooks/useSettings";
import { useTemporaryLog } from '@/hooks/useTemporaryLog';
import { wait } from "@/lib/utils";
import { Emotion } from "@/types";
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';

export const THINKING_DELAY = 0;
export const ANSWER_DELAY = 0;
export const SHOW_ANSWERS_DELAY = 0;
// export const THINKING_DELAY = 500;
// export const ANSWER_DELAY = 1000;
// export const SHOW_ANSWERS_DELAY = 500;

export interface BotAnswer {
  type: 'button_primary' | 'button_secondary' | 'rating' | 'emotions' | 'text';
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
    data?: any;
  }) => void;
}

export interface BotQuestion {
  id: string;
  text: string;
  answers: BotAnswer[];
}

const getEmotionQuestion = (emotion: Emotion, tempLog): BotQuestion => {
  return {
    id: `emotion_${emotion.key}`,
    text: `Do you know why ${t(`log_emotion_${emotion.key}_description`).toLowerCase()}?`,
    answers: [{
      type: 'text',
      action: ({ data, post, next }) => {
        tempLog.update({
          message: tempLog.data.message + `${t(`log_emotion_${emotion.key}_description`)}: ${data.text}\n`,
        })

        post({
          text: data.text,
          author: 'user',
        })

        next()
      }
    }]
  }
}

const getInitialQuestions = ({
  tempLog,
  navigation,
  tagsState,
  settings,
  questions,
  setQuestions,
}: {
  tempLog: ReturnType<typeof useTemporaryLog>,
  navigation: ReturnType<typeof useNavigation>,
  tagsState: ReturnType<typeof useTagsState>,
  settings: SettingsState,
  questions: BotQuestion[];
  setQuestions: (questions: BotQuestion[]) => void;
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
      action: async ({ next, data, post, trigger, setAnswers, setThinking }) => {
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
            text: `I'm sorry to hear that 😔`,
            author: 'bot',
          })
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

  if (settings.steps.includes('emotions')) {
    _questions.push({
      id: 'emotions',
      text: "Do you want to add some emotions you felt?",
      answers: [{
        type: 'button_primary',
        buttonText: "Add emotions",
        action: ({ next }) => {
          navigation.navigate('BotLoggerEmotions', {
            onDone: (emotions) => {
              navigation.goBack()

              if (emotions.length === 0) {
                next({
                  messageText: "I don't want to add emotions"
                })
                return
              }

              emotions.forEach(emotion => {
                const index = questions.findIndex(question => question.id === 'emotions')
                console.log('QUESTIONSQUESTIONSQUESTIONSQUESTIONSQUESTIONS', index, questions.splice(index + 1, 0, getEmotionQuestion(emotion, tempLog)))
                // append questions
                setQuestions(questions.splice(index + 1, 0, getEmotionQuestion(emotion, tempLog)))
              })

              tempLog.update({ emotions: emotions.map(emotion => emotion.key) })
              next({
                messageText: `I felt ${emotions.map(emotion => t(`log_emotion_${emotion.key}`)).join(', ')}`
              })
            }
          })
        }
      }, {
        type: 'button_secondary',
        buttonText: "Maybe later",
        action: ({ next }) => next({
          messageText: "Maybe later",
        })
      }, {
        type: 'button_secondary',
        buttonText: "I don't use emotion tracking",
        action: ({ next, post, setThinking, setAnswers }) => {

          setAnswers([])
          post({
            text: "I don't use emotion tracking",
            author: 'user',
          })

          setThinking(true)

          setTimeout(() => {
            setThinking(false)
            post({
              text: "Ok, I will skip this step for now. You can re-enable it in the settings later.",
              author: 'bot',
            })

            setTimeout(() => {
              next()
            }, SHOW_ANSWERS_DELAY)
          }, ANSWER_DELAY)
        }
      }]
    })
  }

  if (settings.steps.includes('tags')) {
    _questions.push({
      id: 'tags',
      text: "Do you want to add some tags?",
      answers: [{
        type: 'button_primary',
        buttonText: "Add tags",
        action: ({ next }) => {
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
        buttonText: "No, thanks",
        messageText: "No, thanks",
        action: ({ next }) => next({
          messageText: "No, thanks",
        })
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

export const useBotQuestions = (): BotQuestion[] => {
  const tempLog = useTemporaryLog()
  const navigation = useNavigation();
  const tagsState = useTagsState()
  const { settings } = useSettings()

  const [questions, setQuestions] = useState<BotQuestion[]>([])

  useEffect(() => {
    setQuestions(getInitialQuestions({
      tempLog,
      navigation,
      tagsState,
      settings,
      questions,
      setQuestions,
    }))
  }, [])

  return questions
}