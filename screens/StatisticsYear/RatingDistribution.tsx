import dayjs, { Dayjs } from 'dayjs';
import { Dimensions, View } from 'react-native';
import { t } from '../../helpers/translation';
import { useLogState } from '../../hooks/useLogs';
import { getRatingDistributionForYear } from '../../hooks/useStatistics/RatingDistribution';

import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import { BigCard } from '../../components/BigCard';
import { RatingChart } from '../../components/RatingChart';
import { CardFeedback } from '../Statistics/CardFeedback';

dayjs.extend(isSameOrAfter);

export const RatingDistributionYear = ({
  date,
}: {
  date: Dayjs,
}) => {
  const logState = useLogState();

  const items = Object.values(logState.items).filter(item => {
    return dayjs(item.date).isSame(date, 'year')
  })

  const data = getRatingDistributionForYear(items)

  const width = Dimensions.get('window').width - 80;
  const height = width / 2;

  return (
    <BigCard
      title={t('statistics_rating_distribution')}
      subtitle={t('statistics_rating_distribution_description', { date: date.format('YYYY') })}
      isShareable={true}
    >
      <View
        style={{
          justifyContent: 'flex-start',
        }}
      >
        <RatingChart
          data={data}
          height={height}
          width={width}
        />
      </View>
      <CardFeedback
        type='rating_distribution_year'
        details={data}
      />
    </BigCard>
  );
};
