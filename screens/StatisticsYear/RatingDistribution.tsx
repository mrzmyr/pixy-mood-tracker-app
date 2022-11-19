import dayjs, { Dayjs } from 'dayjs';
import { Dimensions, View } from 'react-native';
import { t } from '../../helpers/translation';
import { useLogState } from '../../hooks/useLogs';
import { getRatingDistributionForYear } from '../../hooks/useStatistics/RatingDistribution';

import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import { BigCard } from '../../components/BigCard';
import { RatingChart } from '../../components/RatingChart';
import { CardFeedback } from '../Statistics/CardFeedback';
import { NotEnoughDataOverlay } from '../StatisticsMonth/NotEnoughDataOverlay';
import { useRef } from 'react';
import _ from 'lodash';

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

  const dataDummy = useRef(_.range(0, 11).map((i) => ({
    key: dayjs().month(i).format('MMM')[0],
    count: _.random(3, 6),
    value: _.random(1, 6),
  })))

  const data = getRatingDistributionForYear(items)
  const validatedData = data.filter(d => d.value !== null)

  const width = Dimensions.get('window').width - 80;
  const height = width / 2;

  return (
    <BigCard
      title={t('statistics_rating_distribution')}
      subtitle={t('statistics_rating_distribution_description', { date: date.format('YYYY') })}
      isShareable={true}
    >
      {validatedData.length < 1 && (
        <NotEnoughDataOverlay />
      )}
      {validatedData.length > 5 ? (
        <RatingChart
          data={data}
          height={height}
          width={width} />
      ) : (
        <RatingChart
          data={dataDummy.current}
          height={height}
          width={width} />
      )}

      <CardFeedback
        type='rating_distribution_year'
        details={data}
      />
    </BigCard>
  );
};
