import type { ViewStyle } from "react-native";
import { getTextStyle } from "@/components/typography";
import { RADIUS } from "./radius";
import { SPACE } from "./space";

/** Chip style without outer margin: the parent sets spacing with `gap`. */
export type ChipStyle = Omit<ViewStyle, "margin" | `margin${string}`>;

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
  ...getTextStyle("label", 14),
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

const CHIP_LABEL = getTextStyle("label", 16);

/**
 * Selectable chip for emotions, tags, and people ([`Chip`](../components/chip.tsx)).
 * Measured from the reference at 402 pt screen width.
 */
export const CHIP = {
  height: 42,
  /** Start padding without a marker. */
  paddingLeft: SPACE.lg,
  /** Start padding before an icon or dot marker. */
  paddingLeftLead: 14,
  paddingRight: SPACE.lg,
  /** Marker box: icon size, dot centered inside. */
  lead: 18,
  /** Space between marker and label. */
  gap: SPACE.sm,
  fontSize: CHIP_LABEL.fontSize,
  lineHeight: CHIP_LABEL.lineHeight,
  letterSpacing: -0.2,
  /** One duration for press scale and every color change. */
  duration: 160,
  pressedScale: 0.96,
} as const;
