import type { TextStyle } from "react-native";

import { SPACE } from "@/constants/space";

/**
 * Start of row text inside a list card. Section headline, footer, field
 * label, and input text all start here, so a section has one left edge.
 */
export const LIST_INSET = SPACE.lg;

/**
 * Style for text above or below a list. No horizontal padding or margin:
 * the component sets `LIST_INSET`.
 */
export type ListTextStyle = Omit<
  TextStyle,
  | "padding"
  | "paddingHorizontal"
  | "paddingLeft"
  | "paddingRight"
  | "paddingStart"
  | "paddingEnd"
  | "margin"
  | "marginHorizontal"
  | "marginLeft"
  | "marginRight"
  | "marginStart"
  | "marginEnd"
>;
