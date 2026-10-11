import type { HighlightsProperties } from "@/state/analytics/events";
import type { HighlightsReport } from "../../highlightsReport";
import type { PeopleDistributionData } from "../../PeopleDistribution";
import type { PeoplePeaksData } from "../../PeoplePeaks";

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
  cards,
}: {
  hasPeople: boolean;
  highlightedOnly: boolean;
  cards: HighlightsReport["cards"];
}): PeopleHighlightsState => {
  if (!hasPeople) {
    return { showDistribution: false, showPeaks: false };
  }
  return {
    showDistribution: cards.people_distribution.available,
    showPeaks: highlightedOnly
      ? cards.people_peaks.highlighted
      : cards.people_peaks.available,
  };
};

/** Analytics properties for the people cards, only while the flag is on. */
export const getPeopleHighlightProperties = ({
  hasPeople,
  state,
  distribution,
  peaks,
}: {
  hasPeople: boolean;
  state: PeopleHighlightsState;
  distribution: PeopleDistributionData;
  peaks: PeoplePeaksData;
}): Partial<HighlightsProperties> => {
  if (!hasPeople) {
    return {};
  }
  const properties: Partial<HighlightsProperties> = {
    people_distribution_show: state.showDistribution,
    people_peaks_show: state.showPeaks,
  };
  if (state.showDistribution) {
    properties.people_distribution_count = distribution.people.length;
  }
  if (state.showPeaks) {
    properties.people_peaks_count = peaks.people.length;
  }
  return properties;
};
