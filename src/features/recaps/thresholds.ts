/**
 * Every number a card rule compares against. Starting points from the
 * design prototype; tune here, never inline.
 */
export const THRESHOLDS = {
  /** Reminder nudge: a week that cannot reach this many check-in days. */
  reminderMaxCheckInDays: 5,
  /** Group your tags: at least this many active tags, all in General. */
  categoriesMinTags: 30,
} as const;
