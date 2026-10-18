import type { LogItem } from "@/features/logs";
import {
  dummyTagsDistributionData,
  getTagsDistributionData,
} from "../tags-distribution";
import { useTagsState } from "@/features/tags";
import { TagDistributionContent } from "../screens/statistics/tags-distribution-card";
import { BigCard } from "./big-card";
import { NotEnoughDataOverlay } from "./not-enough-data-overlay";

const MIN_TAGS = 5;

/**
 * Shareable card of the most used tags in `items`. Below 5 tags it shows
 * placeholder data behind the "not enough data" overlay.
 */
export const TagDistribution = ({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: LogItem[];
}) => {
  const tagState = useTagsState();

  const data = getTagsDistributionData(items, tagState.tags);

  return (
    <BigCard
      title={title}
      subtitle={subtitle}
      isShareable
      analyticsId="tag-distribution"
    >
      {data.tags.length < MIN_TAGS && <NotEnoughDataOverlay />}
      {data.tags.length >= MIN_TAGS ? (
        <TagDistributionContent data={data} limit={10} />
      ) : (
        <TagDistributionContent data={dummyTagsDistributionData} limit={10} />
      )}
    </BigCard>
  );
};
