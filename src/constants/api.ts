import { APP_VARIANT } from "@/constants/app-variant";

/** Website webhook that stores in-app feedback from {@link useFeedback}. */
export const FEEDBACK_URL = `https://pixy.day/api/feedback`;
/** Website webhook that stores answers to in-app questions. */
export const QUESTION_SUBMIT_URL = `https://pixy.day/api/question-answers`;
/**
 * Source of in-app questions. Development builds expect the website dev
 * server on port 3000.
 */
export const QUESTIONS_PULL_URL = __DEV__
  ? `http://127.0.0.1:3000/api/questions`
  : `https://pixy.day/api/questions`;

/** Public PostHog project key per variant. EU Cloud (Frankfurt). */
export const POSTHOG_API_KEY = {
  development: `phc_zVpVKHXWr5m2y96cey6YgDmZvn6f5bYS5t4rtbEj8xgL`,
  preview: `phc_vb6cEJ2wqDHszR7nknUoDcSYJr24GvYFSqYASQdnG6ga`,
  production: `phc_uM2XmCDEWBJuHd8qfeNtMGEKKSokreMA574dvfnJ2pCz`,
}[APP_VARIANT];

/** Public Sentry DSN per variant. EU region (Frankfurt). */
export const SENTRY_DSN = {
  development: `https://0c254b5861c1b6afccdcf3b4b6f2daa5@o4512324269506560.ingest.de.sentry.io/4512324276125776`,
  preview: `https://a853ab07ccc357ec48de3c50eca99eeb@o4512324269506560.ingest.de.sentry.io/4512324276191312`,
  production: `https://ef43a2c6a9afecc04aa3ad2366021f4a@o4512324269506560.ingest.de.sentry.io/4512324276256848`,
}[APP_VARIANT];
