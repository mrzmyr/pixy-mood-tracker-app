import { IS_PRODUCTION } from "./AppVariant";

/** Webhook that receives in-app feedback from {@link useFeedback}. */
export const FEEDBACK_URL = `https://eocfnkx0gbrjzvp.m.pipedream.net`;
/** Webhook that receives thumbs up/down feedback on statistics cards. */
export const STATISTICS_FEEDBACK_URL = `https://eoupo57tzejgnqq.m.pipedream.net`;
/** Webhook that receives answers to in-app questions. */
export const QUESTION_SUBMIT_URL = `https://eod7mfqgj8fcpa1.m.pipedream.net`;
/**
 * Source of in-app questions. Development builds expect the website dev
 * server on port 3000.
 */
export const QUESTIONS_PULL_URL = __DEV__
  ? `http://127.0.0.1:3000/api/questions`
  : `https://pixy.day/api/questions`;

/**
 * Public PostHog project key. Development and preview builds report to
 * "Pixy App - Preview", so they never mix with "Pixy App - Production".
 */
export const POSTHOG_API_KEY = IS_PRODUCTION
  ? `phc_C6e56Zzh34IIobIQyMEgKIrCt0H8c5MEr3HkTdpt8n0`
  : `phc_mEJoueVh7YOc5dPgnx69dmHaPjrRHdUoFcLg25P53km`;

/** Public Sentry DSN per variant. Development builds do not report. */
export const SENTRY_DSN = IS_PRODUCTION
  ? `https://d98d0f519b324d9cb0c947b8f29cd0cf@o1112922.ingest.us.sentry.io/6142792`
  : `https://f8281cdecc1515d62ecdfbbb35e882e5@o1112922.ingest.us.sentry.io/4512148831731712`;
