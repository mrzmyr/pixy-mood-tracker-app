/**
 * Home geometry in points, measured from the reference screen (iPhone,
 * 402 pt wide). Typography uses the system font (SF Pro), weight 500.
 */
export const HOME_LAYOUT = {
  /** Header text and profile button to the screen edges. */
  headerInset: 30,
  /** Week strip and entry list to the screen edges. */
  listInset: 24,
  /** Header bottom to the week strip. */
  headerGap: 13,
  /** Selected day: full column width, 72 tall. */
  dayHeight: 72,
  dayRadius: 16,
  /** One entry row without note or meta. */
  rowMinHeight: 71,
  rowPaddingVertical: 22,
  /** Mood square and sleep meter column. */
  iconSize: 20,
  iconInset: 10,
  iconGap: 15,
  /** Time to the right end of a row. */
  rowInsetEnd: 7,
  /** Cover strip above the title. */
  coverHeight: 132,
  coverGap: 12,
  /** Avatars in the meta line, with a 2 pt ring in the page color. */
  avatarSize: 22,
  /** Mood underline under each weekday: 18 x 3 pt, 5 pt plus the 2 pt row gap below the label. */
  dayBarWidth: 18,
  dayBarHeight: 3,
  dayBarGap: 5,
  /** Dotted divider: 2 pt dots every 7 pt. */
  dotSize: 2,
  dotGap: 5,
  /** Space below the last entry, clear of the add button. */
  addClearance: 96,
} as const;

/** Text weight of every Home label, like the reference (SF Pro Medium). */
export const HOME_WEIGHT = "500" as const;

/**
 * Text sizes measured from the reference and the HTML prototype. They sit
 * between Geist steps (21, 19, 23, 11), so Home sets them on purpose
 * instead of rounding to the scale.
 */
export const HOME_TEXT = {
  header: { fontSize: 21, lineHeight: 25 },
  title: { fontSize: 19, lineHeight: 26, letterSpacing: -0.2 },
  time: { fontSize: 16, lineHeight: 26 },
  note: { fontSize: 16, lineHeight: 20 },
  meta: { fontSize: 13, lineHeight: 16 },
  dayNumber: { fontSize: 23, lineHeight: 26 },
  dayLabel: { fontSize: 11, lineHeight: 13, letterSpacing: 0.44 },
} as const;
