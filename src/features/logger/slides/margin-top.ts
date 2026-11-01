import { useScreenHeight } from "@/hooks/use-screen-height";

/** Top margin for logger slides: 16 on screens shorter than 700 pt, else 32. */
export const getSlideMarginTop = (screenHeight: number) =>
  screenHeight < 700 ? 16 : 32;

/** Logger slide top margin that follows screen size changes. */
export const useSlideMarginTop = () => getSlideMarginTop(useScreenHeight());
