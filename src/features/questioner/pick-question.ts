import dayjs from "dayjs";
import semver from "semver";
import type { IQuestion } from "./questioner";

/**
 * Days to wait after an answered question before the next one shows.
 * Daily loggers otherwise get a question on every entry.
 */
export const QUESTION_COOLDOWN_DAYS = 3;

/**
 * Pick the next question to show, or `null` when none should show.
 *
 * Skips everything while the last answer is younger than
 * {@link QUESTION_COOLDOWN_DAYS} calendar days. Otherwise returns the first
 * question in `questions` order that is unanswered, matches `appVersion`
 * (a semver range, missing means any version) and has text in `language`.
 */
export const pickQuestion = ({
  questions,
  answeredIds,
  answeredDates,
  appVersion,
  language,
  now,
}: {
  questions: IQuestion[];
  answeredIds: Set<string>;
  /** Dates of all answered questions, any order. */
  answeredDates: string[];
  appVersion: string;
  language: string;
  now: Date;
}): IQuestion | null => {
  let lastAnsweredAt: dayjs.Dayjs | null = null;
  for (const date of answeredDates) {
    const answeredAt = dayjs(date);
    if (
      answeredAt.isValid() &&
      (lastAnsweredAt === null || answeredAt.isAfter(lastAnsweredAt))
    ) {
      lastAnsweredAt = answeredAt;
    }
  }

  if (
    lastAnsweredAt !== null &&
    dayjs(now).startOf("day").diff(lastAnsweredAt.startOf("day"), "day") <
      QUESTION_COOLDOWN_DAYS
  ) {
    return null;
  }

  return (
    questions.find(
      (question) =>
        (!question.appVersion ||
          semver.satisfies(appVersion, question.appVersion)) &&
        !answeredIds.has(question.id) &&
        question.text[language] !== undefined
    ) ?? null
  );
};
