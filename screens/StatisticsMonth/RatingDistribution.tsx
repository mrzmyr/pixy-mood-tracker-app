import { Dimensions } from 'react-native';
import { BigCard } from '../../components/BigCard';
import { RatingChart } from '../../components/RatingChart';
import { t } from '../../helpers/translation';
import { getRatingDistributionForXDays } from '../../hooks/useStatistics/RatingDistribution';

export const RatingDistribution = ({
  date, items,
}) => {
  const data = getRatingDistributionForXDays(items, date, date.daysInMonth() - 1);

  const width = Dimensions.get('window').width - 80;
  const height = width / 2;

  return (
    <BigCard
      title={t('statistics_rating_distribution')}
      subtitle={t('statistics_rating_distribution_description', { date: date.format('MMMM, YYYY') })}
      isShareable={true}
    >
      <RatingChart
        data={data}
        height={height}
        width={width} />
    </BigCard>
  );
};
