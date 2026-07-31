import * as Updates from 'expo-updates';

export const MIN_TAG_LENGTH = 3;
export const MAX_TAG_LENGTH = 30;

export const MAX_TAGS = 50;
export const MAX_ENTRIES_PER_DAY = 50;
export const STATISTIC_MIN_LOGS = 7;

export const DATE_FORMAT = 'YYYY-MM-DD';

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

export const TRACKING_ENABLED = !__DEV__;

export const CHANGELOG_URL = 'https://pixy.hellonext.co/embed/c?no_header=true'
export const FEEDBACK_FEATURES_URL = 'https://pixy.hellonext.co/embed/b/feedback?no_header=true'

const NON_PRODUCTION_CHANNELS = ['development', 'preview'];

// Local release archives have no EAS channel. Treat them as production so
// experimental features cannot leak into an App Store build.
export const IS_PROD = !__DEV__ && !NON_PRODUCTION_CHANNELS.includes(Updates.channel ?? '');
