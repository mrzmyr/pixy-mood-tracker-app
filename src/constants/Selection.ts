import type { IColors } from "@/constants/Colors";

/** Width of the light ring outside a selected element. */
export const SELECTION_RING_WIDTH = 2;

/**
 * Selected look for chips, tiles, and buttons: 1px tint border plus a light
 * ring outside. Fill and text stay unchanged. The ring is a shadow, so
 * selecting never moves layout. Callers keep a 1px border in both states.
 */
export const getSelectionStyle = (
  colors: Pick<IColors, "selectionBorder" | "selectionRing">,
  selected: boolean,
  idleBorderColor: string
) => ({
  borderColor: selected ? colors.selectionBorder : idleBorderColor,
  boxShadow: selected
    ? `0 0 0 ${SELECTION_RING_WIDTH}px ${colors.selectionRing}`
    : undefined,
});

/**
 * Ring for a borderless round element, like an avatar: 1px tint line plus
 * the light ring, both drawn outside.
 */
export const getSelectionRingShadow = (
  colors: Pick<IColors, "selectionBorder" | "selectionRing">
) =>
  `0 0 0 1px ${colors.selectionBorder}, 0 0 0 ${1 + SELECTION_RING_WIDTH}px ${colors.selectionRing}`;
