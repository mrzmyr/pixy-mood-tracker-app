import { APP_VARIANT } from "./AppVariant";

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

/** Public PostHog project key per variant. */
export const POSTHOG_API_KEY = {
  development: `phc_nwXdZtv4Zr7QPmu952StRgLNWjdQbVunRzfPAe3ZAPgg`,
  preview: `phc_mEJoueVh7YOc5dPgnx69dmHaPjrRHdUoFcLg25P53km`,
  production: `phc_C6e56Zzh34IIobIQyMEgKIrCt0H8c5MEr3HkTdpt8n0`,
}[APP_VARIANT];

/** Public Sentry DSN per variant. */
export const SENTRY_DSN = {
  development: `https://7e3cf7b22cdc845ca12d6a365b12428f@o1112922.ingest.us.sentry.io/4512148892876800`,
  preview: `https://f8281cdecc1515d62ecdfbbb35e882e5@o1112922.ingest.us.sentry.io/4512148831731712`,
  production: `https://d98d0f519b324d9cb0c947b8f29cd0cf@o1112922.ingest.us.sentry.io/6142792`,
}[APP_VARIANT];
