import { HAS_APP_VARIANT } from "./AppVariant";
import { SERVICE_MOCKS } from "./Services";

/** Minimum tag title length accepted by the tag create and edit screens. */
export const MIN_TAG_LENGTH = 3;
/** Maximum tag title length; also the text input `maxLength`. */
export const MAX_TAG_LENGTH = 30;

/** Tag limit; the tag screens hide the create action once it is reached. */
export const MAX_TAGS = 50;
/**
 * Entries required to unlock statistics. The Statistics tab counts only the
 * last 14 days; the calendar report promos count all entries.
 */
export const STATISTIC_MIN_LOGS = 7;

/**
 * dayjs format for local calendar-day keys such as `LogItem.date`.
 *
 * Compare days with this format, not with ISO timestamps, which are UTC.
 */
export const DATE_FORMAT = "YYYY-MM-DD";

/**
 * Tailwind palette names users can assign to tags.
 *
 * Tag color values are persisted, so only append new names; removing or
 * renaming one breaks existing tags. Each name must exist in `TailwindColors`.
 */
export const TAG_COLOR_NAMES = [
  "slate",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
];

/**
 * Analytics follow user consent in every app variant; each variant reports
 * to its own PostHog project (see `POSTHOG_API_KEY`). Off in Jest and in
 * builds with service mocks.
 */
export const TRACKING_ENABLED = HAS_APP_VARIANT && !SERVICE_MOCKS;

/** Changelog board opened in the in-app browser from Settings. */
export const CHANGELOG_URL = "https://pixy.hellonext.co/embed/c?no_header=true";
/** Feature request board opened in the in-app browser from Settings. */
export const FEEDBACK_FEATURES_URL =
  "https://pixy.hellonext.co/embed/b/feedback?no_header=true";
