/**
 * Feature flag keys. Each key needs a boolean flag with the same key in the
 * PostHog project of every app variant.
 */
export const FEATURE_FLAGS = [
  "app-icons",
  "calendar-timeline",
  "development",
  "emotion-icons",
  "feature-flag-overrides",
  "interventions",
  "ios-widget",
  "location",
  "people",
  "photos",
  "support-pixy",
] as const;

/** One key of {@link FEATURE_FLAGS}. */
export type FeatureFlag = (typeof FEATURE_FLAGS)[number];

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
  "support-pixy": {
    description: "Support Pixy card",
    location: "Settings, below Development",
  },
};

/** Check an untrusted value, for example a deep link parameter. */
export const isFeatureFlag = (value: unknown): value is FeatureFlag =>
  FEATURE_FLAGS.some((key) => key === value);
