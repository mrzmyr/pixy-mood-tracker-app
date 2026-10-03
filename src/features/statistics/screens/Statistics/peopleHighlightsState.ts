/** Which people cards show; both `false` without the `people` flag. */
export interface PeopleHighlightsState {
  showDistribution: boolean;
  showPeaks: boolean;
}

/**
 * Decide which people cards show. `highlightedOnly` keeps the peaks card
 * for the short list on the Statistics tab; the full list shows it whenever
 * it has data.
 */
export const getPeopleHighlightsState = ({
  hasPeople,
  highlightedOnly,
  isAvailable,
  isHighlighted,
}: {
  hasPeople: boolean;
  highlightedOnly: boolean;
  isAvailable: (type: string) => boolean;
  isHighlighted: (type: string) => boolean;
}): PeopleHighlightsState => {
  if (!hasPeople) {
    return { showDistribution: false, showPeaks: false };
  }
  return {
    showDistribution: isAvailable("people_distribution"),
    showPeaks: highlightedOnly
      ? isHighlighted("people_peaks")
      : isAvailable("people_peaks"),
  };
};
