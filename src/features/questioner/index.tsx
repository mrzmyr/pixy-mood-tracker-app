import { QUESTIONS_PULL_URL, QUESTION_SUBMIT_URL } from "@/constants/API";
import { language, locale } from "@/helpers/translation";
import dayjs from "dayjs";
import { useEffect, useEffectEvent, useState } from "react";
import { Platform } from "react-native";
import semver from "semver";
import pkg from "../../../package.json";
import { useAnalytics } from "@/state/analytics";
import { useSettings } from "@/state/settings";

/**
 * Remote in-app survey question.
 *
 * `appVersion` is a semver range matched against the app version. Questions
 * without text in the device language are skipped.
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
 * Fetch the next unanswered question for this app version and language.
 *
 * At most one question per day: after an answer today, `question` stays
 * `null`. Fetch failures also yield `null`. Development builds do not
 * submit answers but still mark the question as answered.
 */
export const useQuestioner = () => {
  const analytics = useAnalytics();
  const { hasActionDone, addActionDone, settings } = useSettings();

  const [question, setQuestion] = useState<IQuestion | null>(null);

  const questionsDone = settings.actionsDone.filter((action) =>
    action?.title?.startsWith("question_slide_")
  );

  // Effect event: only called by the mount effect below, so it reads the
  // settings of that render without making the effect re-run on changes.
  const getQuestion = useEffectEvent(async (): Promise<IQuestion | null> => {
    const lastQuestionAnsweredToday =
      questionsDone.length > 0
        ? dayjs(questionsDone.at(-1)?.date).isSame(dayjs(), "day")
        : false;

    if (lastQuestionAnsweredToday) {
      console.log("Not showing question because one was answered today");
      return null;
    }

    try {
      const response = await fetch(QUESTIONS_PULL_URL);
      const data = await response.json();
      if (!data) {
        return null;
      }

      const nextQuestion = data.find((candidate: IQuestion) => {
        const satisfiesVersion = candidate.appVersion
          ? semver.satisfies(pkg.version, candidate.appVersion)
          : true;
        const hasBeenAnswered = hasActionDone(`question_slide_${candidate.id}`);
        const isInMyLanguage = candidate.text[language] !== undefined;

        if (!satisfiesVersion) {
          console.log(
            "Question not shown because version does not match",
            candidate.appVersion,
            pkg.version
          );
        }
        if (hasBeenAnswered) {
          console.log(
            "Question not shown because it has been answered",
            candidate.id
          );
        }
        if (!isInMyLanguage) {
          console.log(
            "Question not shown because it is not in my language",
            candidate.text
          );
        }

        return satisfiesVersion && !hasBeenAnswered && isInMyLanguage;
      });

      return nextQuestion || null;
    } catch {
      return null;
    }
  });

  const submit = async (
    answeredQuestion: IQuestion,
    answers: IQuestion["answers"]
  ) => {
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
      locale,
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

    analytics.track("questioner_submit", body);

    console.log("Sending Question Feedback", body);

    if (__DEV__) {
      console.log("Not sending Question Feedback in dev mode");
      addActionDone(`question_slide_${answeredQuestion.id}`);
      return;
    }

    await fetch(QUESTION_SUBMIT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    addActionDone(`question_slide_${answeredQuestion.id}`);
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
