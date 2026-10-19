/**
 * Feature flag keys. Each key needs a flag with the same key in the PostHog
 * project of every app variant: boolean, or multivariate for the keys of
 * {@link FEATURE_FLAG_VARIANTS}.
 */
export const FEATURE_FLAGS = [
  "app-icons",
  "app-lock",
  "app-lock-bypass",
  "calendar-map",
  "calendar-timeline",
  "development",
  "emotion-icons",
  "emotion-picker",
  "feature-flag-overrides",
  "interventions",
  "ios-widget",
  "location",
  "people",
  "photos",
  "profile",
  "recaps",
  "support-pixy",
] as const;

/** One key of {@link FEATURE_FLAGS}. */
export type FeatureFlag = (typeof FEATURE_FLAGS)[number];

/**
 * Keys with a multivariate PostHog flag, and the variant keys it returns.
 * Variants are alternatives of one feature: a user sees at most one.
 */
export const FEATURE_FLAG_VARIANTS = {
  "emotion-picker": ["cards", "slider", "weather"],
} as const satisfies Partial<Record<FeatureFlag, readonly string[]>>;

/** Key of {@link FEATURE_FLAG_VARIANTS}. */
export type VariantFlag = keyof typeof FEATURE_FLAG_VARIANTS;

/** One variant of a {@link VariantFlag}. */
export type FeatureFlagVariant<K extends VariantFlag = VariantFlag> =
  (typeof FEATURE_FLAG_VARIANTS)[K][number];

/** Whether `key` is multivariate. */
export const isVariantFlag = (key: FeatureFlag): key is VariantFlag =>
  key in FEATURE_FLAG_VARIANTS;

/**
 * `value` as a variant of `key`, or `undefined` when `key` has no variants
 * or `value` is none of them. PostHog sends `true`, `false`, or a variant key.
 */
export const asFeatureFlagVariant = <K extends VariantFlag>(
  key: K,
  value: string | boolean | undefined
): FeatureFlagVariant<K> | undefined =>
  FEATURE_FLAG_VARIANTS[key].find((variant) => variant === value);

/**
 * What each flag turns on and where it shows, for Settings > Development >
 * Feature flags. Every key needs an entry.
 */
export const FEATURE_FLAG_DETAILS: Record<
  FeatureFlag,
  { description: string; location: string }
> = {
  "app-icons": {
    description: "Flagged alternate app icons",
    location: "Settings > App icon",
  },
  "app-lock": {
    description: "Face ID, Touch ID, or passcode lock",
    location: "Settings > App Lock",
  },
  "app-lock-bypass": {
    description:
      "Opens a locked app for a targeted person. PostHog only, local overrides never apply",
    location: "Lock screen",
  },
  "calendar-map": {
    description: "Map layout for the calendar, iOS only",
    location: "Calendar > Filters menu",
  },
  "calendar-timeline": {
    description: "Timeline layout for the calendar",
    location: "Calendar > Filters menu",
  },
  development: {
    description: "Development section in production builds",
    location: "Settings > Development",
  },
  "emotion-icons": {
    description: "Icons instead of dots for chosen emotions",
    location: "Check-in > Emotions step",
  },
  "emotion-picker": {
    description:
      "Emotion picker variant: weather (tiles lead to emotions), slider, cards",
    location: "Check-in > Emotions step",
  },
  "feature-flag-overrides": {
    description: "Flag overrides in production builds",
    location: "Settings > Development > Feature flags",
  },
  interventions: {
    description: "Exercises for matching emotions",
    location: "Check-in confirmation, Calendar footer",
  },
  "ios-widget": {
    description: "iOS home screen widget",
    location: "Settings > Widgets",
  },
  location: {
    description: "Place of the check-in",
    location: "Settings > Check-in",
  },
  people: {
    description: "People step and people on entries",
    location:
      "Check-in, Settings > Check-in, Day view, Calendar filters, Statistics",
  },
  photos: {
    description: "Photos step and photos on entries",
    location: "Check-in, Settings > Check-in, Day view",
  },
  profile: {
    description:
      "Name and photo of the user; avatar replaces the Settings icon",
    location: "Calendar header, Settings > Profile",
  },
  recaps: {
    description: "Recap cards for week, month, quarter, and year",
    location: "Settings > Recaps",
  },
  "support-pixy": {
    description: "Support Pixy card",
    location: "Settings, below Development",
  },
};

/** Check an untrusted value, for example a deep link parameter. */
export const isFeatureFlag = (value: unknown): value is FeatureFlag =>
  FEATURE_FLAGS.some((key) => key === value);
