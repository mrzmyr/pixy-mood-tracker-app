import { useEffect, useRef } from "react"
import { QUESTIONS_PULL_URL, QUESTION_SUBMIT_URL } from "../constants/API"
import semver from 'semver'
import pkg from '../package.json'
import { useSettings } from "./useSettings"
import { language, locale } from "../helpers/translation"
import { Platform } from "react-native"
import { useLogState } from "./useLogs"
import { useAnalytics } from "./useAnalytics"

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
  const logs = useLogState()
  const analytics = useAnalytics()
  const { hasActionDone, addActionDone, settings } = useSettings()
  const isMounted = useRef(false)

  const getQuestion = (): Promise<IQuestion | null> => {
    return fetch(QUESTIONS_PULL_URL)
      .then(response => response.json())
      .then(data => {
        const question = data.find((question: IQuestion) => {
          const satisfiesVersion = question.appVersion ? semver.satisfies(pkg.version, question.appVersion) : true
          const hasBeenAnswered = hasActionDone(`question_slide_${question.id}`)
          const isInMyLanguage = question.text[language] !== undefined;
          const minItemsTracked = logs.items.length >= 3;

          return (
            minItemsTracked &&
            satisfiesVersion &&
            !hasBeenAnswered &&
            isInMyLanguage
          )
        })

        return question || null
      })
      .catch(error => {
        console.log(error)
        return null;
      })
  }

  const submit = (question: IQuestion, answers: IQuestion['answers']) => {

    const question_text = question.text[language] || question.text['en'];

    const answer_texts = answers.map(answer => {
      if (answer?.text[language]) {
        return `${answer.emoji} ${answer.text[language]}`
      } else {
        `${answer.emoji} ${answer?.text?.en}`
      }
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

    // if(__DEV__) {
    //   console.log('Not sending Question Feedback in dev mode')
    //   addActionDone(`question_slide_${question.id}`)
    //   return
    // }

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
    return () => {
      isMounted.current = false
    }
  }, [])

  return {
    getQuestion,
    submit
  }
}