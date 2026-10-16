/** Vertical extent in points: top edge and height. */
export interface Span {
  y: number;
  height: number;
}

/** At least half of `item` lies inside `viewport`. Same coordinate space. */
export const isMostlyVisible = (item: Span, viewport: Span) => {
  if (item.height <= 0) {
    return false;
  }
  const top = Math.max(item.y, viewport.y);
  const bottom = Math.min(item.y + item.height, viewport.y + viewport.height);
  return Math.max(0, bottom - top) / item.height >= 0.5;
};
