import { Dayjs } from 'dayjs';
import { BigCard } from '../../components/BigCard';
import { t } from '../../helpers/translation';
import { LogItem } from '../../hooks/useLogs';
import { getTagsDistributionData } from '../../hooks/useStatistics/TagsDistribution';
import { useTagsState } from '../../hooks/useTags';
import { TagDistributionContent } from '../Statistics/TagsDistributionCard';

export const TagDistribution = ({
  date,
  items,
}: {
  date: Dayjs,
  items: LogItem[],
}) => {
  const tagState = useTagsState();

  const data = getTagsDistributionData(items, tagState.tags);

  return (
    <BigCard
      title={t('statistics_most_used_tags')}
      subtitle={t('statistics_most_used_tags_description', { date: date.format('MMMM, YYYY') })}
      isShareable={true}
    >
      <TagDistributionContent
        data={data}
        limit={10}
      />
    </BigCard>
  );
};
