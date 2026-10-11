/**
 * Every number a card rule compares against. Starting points from the
 * design prototype; tune here, never inline.
 */
export const THRESHOLDS = {
  /** Reminder nudge: a week with fewer check-in days than this. */
  reminderMaxCheckInDays: 5,
  /** Reminder nudge: time the reminder starts at, `HH:mm`. */
  reminderTime: "20:00",
  /** Group your tags: at least this many active tags, all in General. */
  categoriesMinTags: 30,
} as const;
