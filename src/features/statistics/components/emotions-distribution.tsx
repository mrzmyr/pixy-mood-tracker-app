import type { LogItem } from "@/features/logs";
import {
  dummyEmotionsDistributionData,
  getEmotionsDistributionData,
} from "../emotions-distribution";
import { EmotionsDistributionContent } from "../screens/statistics/emotions-distribution-card";
import { BigCard } from "./big-card";
import { NotEnoughDataOverlay } from "./not-enough-data-overlay";

const MIN_TAGS = 5;

/**
 * Shareable card of the most used emotions in `items`. Below 5 distinct
 * emotions it shows placeholder data behind the "not enough data" overlay.
 */
export const EmotionsDistribution = ({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: LogItem[];
}) => {
  const data = getEmotionsDistributionData(items);

  return (
    <BigCard
      title={title}
      subtitle={subtitle}
      isShareable
      analyticsId="emotions-distribution"
    >
      {data.emotions.length < MIN_TAGS && <NotEnoughDataOverlay />}
      {data.emotions.length >= MIN_TAGS ? (
        <EmotionsDistributionContent data={data} limit={10} />
      ) : (
        <EmotionsDistributionContent
          data={dummyEmotionsDistributionData}
          limit={10}
        />
      )}
    </BigCard>
  );
};
