import { QUESTIONS_PULL_URL, QUESTION_SUBMIT_URL } from "@/constants/api";
import { getLanguage, getLocale } from "@/lib/translation";
import { useEffect, useEffectEvent, useState } from "react";
import { Platform } from "react-native";
import pkg from "../../../package.json";
import { useAnalytics } from "@/state/analytics";
import { useSettings } from "@/state/settings";
import { pickQuestion } from "./pick-question";

const ACTION_PREFIX = "question_slide_";

/**
 * Remote in-app survey question.
 *
 * `appVersion` is a semver range matched against the app version. Questions
 * without text in the app language are skipped.
 */
export interface IQuestion {
  id: string;
  appVersion: string;
  text: {
    en: string;
    de?: string;
  };
  type: "single" | "multiple";
  answers: {
    id: string;
    emoji: string;
    text: {
      en: string;
      de?: string;
    } | null;
  }[];
}

/**
 * Fetch the next question to show, picked by {@link pickQuestion}.
 *
 * After an answer, no question shows for `QUESTION_COOLDOWN_DAYS` days.
 * Fetch failures yield `null`. Development builds do not submit answers but
 * still mark the question as answered.
 */
export const useQuestioner = () => {
  const analytics = useAnalytics();
  const { addActionDone, settings } = useSettings();

  const [question, setQuestion] = useState<IQuestion | null>(null);

  // Effect event: only called by the mount effect below, so it reads the
  // settings of that render without making the effect re-run on changes.
  const getQuestion = useEffectEvent(async (): Promise<IQuestion | null> => {
    const questionsDone = settings.actionsDone.filter((action) =>
      action?.title?.startsWith(ACTION_PREFIX)
    );

    try {
      const response = await fetch(QUESTIONS_PULL_URL);
      const data: IQuestion[] | null = await response.json();
      if (!Array.isArray(data)) {
        return null;
      }

      return pickQuestion({
        questions: data,
        answeredIds: new Set(
          questionsDone.map((action) =>
            action.title.slice(ACTION_PREFIX.length)
          )
        ),
        answeredDates: questionsDone.map((action) => action.date),
        appVersion: pkg.version,
        language: getLanguage(),
        now: new Date(),
      });
    } catch {
      return null;
    }
  });

  const submit = async (
    answeredQuestion: IQuestion,
    answers: IQuestion["answers"]
  ) => {
    const language = getLanguage();
    const question_text =
      answeredQuestion.text[language] || answeredQuestion.text["en"];

    const answer_texts = answers
      .map((answer) => {
        if (answer.text === null) {
          return answer.emoji;
        }

        if (answer?.text[language]) {
          return `${answer.emoji} ${answer.text[language]}`;
        }

        return `${answer.emoji} ${answer?.text?.en}`;
      })
      .join(", ");

    const metaData = {
      locale: getLocale(),
      version: pkg.version,
      os: Platform.OS,
      deviceId: settings.deviceId,
    };

    const body = {
      date: new Date().toISOString(),
      language,
      question_text,
      answer_texts,
      answer_ids: answers.map((answer) => answer.id).join(", "),
      question: answeredQuestion,
      ...metaData,
    };

    analytics.track("feedback:question_answered", {
      question_id: answeredQuestion.id,
      answer_ids: answers.map((answer) => answer.id),
    });

    console.log("Sending Question Feedback", body);

    if (__DEV__) {
      console.log("Not sending Question Feedback in dev mode");
      addActionDone(`${ACTION_PREFIX}${answeredQuestion.id}`);
      return;
    }

    await fetch(QUESTION_SUBMIT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    addActionDone(`${ACTION_PREFIX}${answeredQuestion.id}`);
  };

  useEffect(() => {
    let isCancelled = false;

    void (async () => {
      const nextQuestion = await getQuestion();
      if (!isCancelled) {
        setQuestion(nextQuestion);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, []);

  return {
    question,
    submit,
  };
};
