import type { ViewStyle } from "react-native";

/** Inner padding of a recap card. Footers and media line up with it. */
export const CARD_PADDING = 24;

/**
 * Name column of list rows in change and pattern cards. One width for both,
 * so names line up; long names wrap instead of pushing the chart out.
 */
export const LABEL_COLUMN: ViewStyle = {
  flexBasis: "35%",
  flexShrink: 1,
};

/**
 * Compact tag inside a row. Drops the tag's own flow margins, which push it
 * off the row center, and keeps the pill as wide as its text.
 */
export const ROW_TAG: ViewStyle = {
  marginRight: 0,
  marginBottom: 0,
  alignSelf: "flex-start",
};
