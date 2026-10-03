import type { PeopleDistributionData } from "../../PeopleDistribution";
import type { PeoplePeaksData } from "../../PeoplePeaks";
import { PeopleDistributionCard } from "./PeopleDistributionCard";
import { PeoplePeaksCard } from "./PeoplePeaksCard";
import type { PeopleHighlightsState } from "./peopleHighlightsState";

/** People cards of a highlights list: mood with people, then most seen. */
export const PeopleHighlights = ({
  state,
  distribution,
  peaks,
}: {
  state: PeopleHighlightsState;
  distribution: PeopleDistributionData;
  peaks: PeoplePeaksData;
}) => (
  <>
    {state.showPeaks && <PeoplePeaksCard data={peaks} />}
    {state.showDistribution && <PeopleDistributionCard data={distribution} />}
  </>
);
