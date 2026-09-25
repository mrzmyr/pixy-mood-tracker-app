import { useAnonymizer } from "@/state/analytics/anonymizer";
import type { LogItem } from "@/features/logs";
import {
  dummyTagsDistributionData,
  getTagsDistributionData,
} from "@/features/statistics/TagsDistribution";
import { useTagsState } from "@/features/tags";
import { TagDistributionContent } from "../../screens/Statistics/TagsDistributionCard";
import { BigCard } from "../BigCard";
import { NotEnoughDataOverlay } from "./NotEnoughDataOverlay";

const MIN_TAGS = 5;

/**
 * Shareable card of the most used tags in `items`. Below 5 tags it shows
 * placeholder data behind the "not enough data" overlay. Tag titles are
 * anonymized in the feedback payload.
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
  const { anonymizeTag } = useAnonymizer();
  const tagState = useTagsState();

  const data = getTagsDistributionData(items, tagState.tags);

  return (
    <BigCard
      title={title}
      subtitle={subtitle}
      isShareable
      hasFeedback
      analyticsId="tag-distribution"
      analyticsData={data.tags.map((tag) => ({
        ...tag,
        details: anonymizeTag(tag.details),
      }))}
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
