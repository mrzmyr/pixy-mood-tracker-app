import { useWindowDimensions } from "react-native";

/** Top margin for logger slides: 16 in windows shorter than 700 pt, else 32. */
export const useSlideMarginTop = () =>
  useWindowDimensions().height < 700 ? 16 : 32;
