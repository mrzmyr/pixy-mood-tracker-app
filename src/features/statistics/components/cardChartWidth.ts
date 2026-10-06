import { BEZEL } from "@/constants/Bezel";

/** Screen padding (20 each side) plus card padding (16 each side). */
const CARD_INSET = 72;
/** Width the bezel takes: gap and shell border plus inner border, both sides. */
const BEZEL_INSET = 2 * (BEZEL.gap + 2 * BEZEL.borderWidth);
/** Safety margin so charts never touch the card edge. */
const CHART_SLACK = 8;

/** Width for a chart inside `Card`, from the window width. */
export const getCardChartWidth = (windowWidth: number) =>
  windowWidth - CARD_INSET - BEZEL_INSET - CHART_SLACK;
