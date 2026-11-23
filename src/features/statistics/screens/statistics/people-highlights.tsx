import type { PeopleDistributionData } from "../../people-distribution";
import type { PeoplePeaksData } from "../../people-peaks";
import { PeopleDistributionCard } from "./people-distribution-card";
import { PeoplePeaksCard } from "./people-peaks-card";
import type { PeopleHighlightsState } from "./people-highlights-state";

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
