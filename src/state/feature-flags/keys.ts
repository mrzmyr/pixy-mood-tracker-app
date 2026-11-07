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
  "chip-active-ink",
  "development",
  "feature-flag-overrides",
  "home-week",
  "menstruation",
  "more-tags",
  "needs",
  "people",
  "photo-peek",
  "photos",
  "quick-check-in",
  "recap-sleep",
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
      "Opens a locked app for a targeted person. Remote config only, overrides never apply",
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
  "chip-active-ink": {
    description:
      "Gray fill and dark text for selected chips, instead of the inverted style",
    location: "Check-in > Emotions, Tags; Quick check-in",
  },
  "home-week": {
    description: "Home with week strip and entries of the selected day",
    location: "App start, Calendar > bottom left button",
  },
  development: {
    description: "Development section in production builds",
    location: "Settings > Development",
  },
  "feature-flag-overrides": {
    description: "Flag overrides in production builds",
    location: "Settings > Development > Feature flags",
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
  "photo-peek": {
    description:
      "Long press an empty calendar spot to show day photos on pixels",
    location: "Calendar",
  },
  photos: {
    description: "Photos step and photos on entries",
    location: "Check-in, Settings > Check-in, Day view",
  },
  "quick-check-in": {
    description:
      "Quick check-in screen (iOS) or an ongoing notification (Android)",
    location: "Calendar, Settings > Check-in, notification shade",
  },
  "recap-sleep": {
    description:
      "Sleep slide in the month recap story, with an optional look at rough nights",
    location: "Month recap story, after the tag slides",
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
