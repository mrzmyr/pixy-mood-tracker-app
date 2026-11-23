import type { HighlightsProperties } from "@/state/analytics/events";
import type { HighlightsReport } from "../../highlights-report";
import type { PeopleDistributionData } from "../../people-distribution";
import type { PeoplePeaksData } from "../../people-peaks";

/** Which people cards show. */
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
  highlightedOnly,
  cards,
}: {
  highlightedOnly: boolean;
  cards: HighlightsReport["cards"];
}): PeopleHighlightsState => ({
  showDistribution: cards.people_distribution.available,
  showPeaks: highlightedOnly
    ? cards.people_peaks.highlighted
    : cards.people_peaks.available,
});

/** Analytics properties for the people cards. */
export const getPeopleHighlightProperties = ({
  state,
  distribution,
  peaks,
}: {
  state: PeopleHighlightsState;
  distribution: PeopleDistributionData;
  peaks: PeoplePeaksData;
}): Partial<HighlightsProperties> => {
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
