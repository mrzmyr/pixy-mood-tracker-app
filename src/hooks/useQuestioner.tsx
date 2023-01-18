import { QUESTIONS_PULL_URL, QUESTION_SUBMIT_URL } from "@/constants/API"
import { language, locale } from "@/helpers/translation"
import dayjs from "dayjs"
import { useEffect, useRef, useState } from "react"
import { Platform } from "react-native"
import semver from 'semver'
import pkg from '../../package.json'
import { useAnalytics } from "./useAnalytics"
import { useSettings } from "./useSettings"

export interface IQuestion {
  id: string;
  appVersion: string;
  text: {
    en: string;
    de?: string;
  };
  type: 'single' | 'multiple';
  answers: {
    id: string;
    emoji: string;
    text: {
      en: string;
      de?: string;
    } | null;
  }[]
}

export const useQuestioner = () => {
  const analytics = useAnalytics()
  const { hasActionDone, addActionDone, settings } = useSettings()
  const isMounted = useRef(true)

  const [question, setQuestion] = useState<IQuestion | null>(null)

  const questionsDone = settings.actionsDone.filter((action: any) => action?.title?.startsWith('question_slide_'))

  const getQuestion = (): Promise<IQuestion | null> => {
    const lastQuestionAnsweredToday = questionsDone.length > 0 ? dayjs(questionsDone[questionsDone.length - 1].date).isSame(dayjs(), 'day') : false

    if (lastQuestionAnsweredToday) {
      console.log('Not showing question because one was answered today')
      return Promise.resolve(null)
    }

    return fetch(QUESTIONS_PULL_URL)
      .then(response => response.json())
      .then(data => {
        if (!data) return null;

        const question = data.find((question: IQuestion) => {
          const satisfiesVersion = question.appVersion ? semver.satisfies(pkg.version, question.appVersion) : true
          const hasBeenAnswered = hasActionDone(`question_slide_${question.id}`)
          const isInMyLanguage = question.text[language] !== undefined;

          if (!satisfiesVersion) console.log('Question not shown because version does not match', question.appVersion, pkg.version)
          if (hasBeenAnswered) console.log('Question not shown because it has been answered', question.id)
          if (!isInMyLanguage) console.log('Question not shown because it is not in my language', question.text)

          return (
            satisfiesVersion &&
            !hasBeenAnswered &&
            isInMyLanguage
          )
        })

        return question || null
      })
      .catch(error => {
        return null;
      })
  }

  const submit = (question: IQuestion, answers: IQuestion['answers']) => {

    const question_text = question.text[language] || question.text['en'];

    const answer_texts = answers.map(answer => {
      if (answer.text === null) {
        return answer.emoji;
      }

      if (answer?.text[language]) {
        return `${answer.emoji} ${answer.text[language]}`
      }

      return `${answer.emoji} ${answer?.text?.en}`
    }).join(', ')

    const metaData = {
      locale: locale,
      version: pkg.version,
      os: Platform.OS,
      deviceId: settings.deviceId,
    }

    const body = {
      date: new Date().toISOString(),
      language,
      question_text,
      answer_texts,
      answer_ids: answers.map(answer => answer.id).join(', '),
      question,
      ...metaData,
    }

    analytics.track('questioner_submit', body)

    console.log('Sending Question Feedback', body)

    if (__DEV__) {
      console.log('Not sending Question Feedback in dev mode')
      addActionDone(`question_slide_${question.id}`)
      return
    }

    return fetch(QUESTION_SUBMIT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
      .then(() => {
        addActionDone(`question_slide_${question.id}`)
      })
  }

  useEffect(() => {
    getQuestion().then(question => {
      if (isMounted.current) {
        setQuestion(question)
      }
    })

    return () => {
      isMounted.current = false
    }
  }, [])

  return {
    question,
    submit
  }
}