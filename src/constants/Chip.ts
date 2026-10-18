import { RADIUS } from "./Radius";

/**
 * Compact chip shared by emotion, tag, and person chips in dense rows, like
 * timeline cards. One height and shape, so mixed rows line up.
 */
export const COMPACT_CHIP = {
  height: 30,
  borderRadius: RADIUS.full,
  paddingHorizontal: 12,
  /** Left padding before a person's avatar; centers it in the pill end. */
  paddingLeftAvatar: 5,
  fontSize: 15,
  /** Space between marker (dot, icon, avatar) and label. */
  gap: 6,
  avatarSize: 20,
} as const;

/** Space between chips in a row or a wrapping group. */
export const CHIP_GAP = 8;

/**
 * Wrapping group of tag or person chips. Right padding reserves one gap at
 * the end of each line, bottom padding one gap below the last line.
 */
export const CHIP_FLOW = {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: CHIP_GAP,
  paddingRight: CHIP_GAP,
  paddingBottom: CHIP_GAP,
} as const;
