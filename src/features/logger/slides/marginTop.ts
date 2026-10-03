import { Dimensions } from "react-native";

/** Top margin for logger slides: 16 on screens shorter than 700 pt, else 32. */
export const getSlideMarginTop = () =>
  Dimensions.get("screen").height < 700 ? 16 : 32;
