/**
 * Feature flag keys. Each key needs a boolean flag with the same key in the
 * PostHog project of every app variant.
 */
export const FEATURE_FLAGS = [
  "app-icons",
  "app-lock",
  "app-lock-bypass",
  "apple-health",
  "calendar-timeline",
  "development",
  "feature-flag-overrides",
  "interventions",
  "location",
  "menstruation",
  "more-tags",
  "needs",
  "people",
  "photos",
  "profile",
  "quick-check-in",
  "recaps",
  "support-pixy",
  "voice-mode",
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
  "app-lock": {
    description: "Face ID, Touch ID, or passcode lock",
    location: "Settings > App Lock",
  },
  "app-lock-bypass": {
    description:
      "Opens a locked app for a targeted person. PostHog only, local overrides never apply",
    location: "Lock screen",
  },
  "apple-health": {
    description: "Sleep quality filled from Apple Health",
    location: "Settings > Check-in > Sleep, new entries, Edit entry > Sleep",
  },
  "calendar-timeline": {
    description: "Timeline layout for the calendar",
    location: "Calendar > Filters menu",
  },
  development: {
    description: "Development section in production builds",
    location: "Settings > Development",
  },
  "feature-flag-overrides": {
    description: "Flag overrides in production builds",
    location: "Settings > Development > Feature flags",
  },
  interventions: {
    description: "Exercises for matching emotions",
    location: "Check-in confirmation, Calendar footer",
  },
  location: {
    description: "Place of the check-in",
    location: "Settings > Check-in",
  },
  menstruation: {
    description: "Daily menstruation flow check-in",
    location: "Check-in, Settings > Check-in",
  },
  "more-tags": {
    description: "Tag limit 500 instead of 50",
    location: "Tags, Settings > Tags",
  },
  needs: {
    description: "Rate six needs, then get matching emotions",
    location: "Check-in > Emotions step",
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
  "quick-check-in": {
    description:
      "Quick check-in screen (iOS) or an ongoing notification (Android)",
    location: "Calendar, Settings > Check-in, notification shade",
  },
  recaps: {
    description: "Recap cards for week, month, and year",
    location: "Settings > Recaps",
  },
  "support-pixy": {
    description: "Support Pixy card",
    location: "Settings, below Development",
  },
  "voice-mode": {
    description: "Talk about your day; Pixy prefills a check-in",
    location: "Calendar > Mic button next to +",
  },
};

/** Check an untrusted value, for example a deep link parameter. */
export const isFeatureFlag = (value: unknown): value is FeatureFlag =>
  FEATURE_FLAGS.some((key) => key === value);
