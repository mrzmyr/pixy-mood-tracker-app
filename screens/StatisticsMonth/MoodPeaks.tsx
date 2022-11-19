import dayjs from 'dayjs';
import _ from 'lodash';
import { BigCard } from '../../components/BigCard';
import { DATE_FORMAT } from '../../constants/Config';
import { t } from '../../helpers/translation';
import { LogItem } from '../../hooks/useLogs';
import { getMoodPeaksNegativeData, getMoodPeaksPositiveData } from '../../hooks/useStatistics/MoodPeaks';
import { MoodPeaksContent } from '../Statistics/MoodPeaksCards';
import { NotEnoughDataOverlay } from './NotEnoughDataOverlay';

export const MoodPeaks = ({
  date, items,
}) => {
  const dataNegative = getMoodPeaksNegativeData(items);
  const dataPositive = getMoodPeaksPositiveData(items);

  const dataNegativeDummy = {
    items: [{
      id: '1',
      date: dayjs().format(DATE_FORMAT),
      rating: 'bad' as LogItem['rating'],
      message: 'I am feeling',
      createdAt: dayjs(date).toISOString(),
    }, {
      id: '2',
      date: dayjs(date).add(4, 'day').format(DATE_FORMAT),
      rating: 'extremely_bad' as LogItem['rating'],
      message: 'I am feeling',
      createdAt: dayjs(date).add(4, 'day').toISOString(),
    }, {
      id: '3',
      date: dayjs(date).add(8, 'day').format(DATE_FORMAT),
      rating: 'extremely_bad' as LogItem['rating'],
      message: 'I am feeling',
      createdAt: dayjs(date).add(8, 'day').toISOString(),
    }, {
      id: '4',
      date: dayjs(date).add(12, 'day').format(DATE_FORMAT),
      rating: 'extremely_bad' as LogItem['rating'],
      message: 'I am feeling',
      createdAt: dayjs(date).add(12, 'day').toISOString(),
    }]
  }

  const dataPositiveDummy = {
    items: dataNegativeDummy.items.map((item) => ({
      ...item,
      rating: 'extremely_good' as LogItem['rating'],
    }))
  }

  const monthStart = dayjs(date).startOf('month').format(DATE_FORMAT);
  const monthEnd = dayjs(date).endOf('month').format(DATE_FORMAT);

  return (
    <>
      <BigCard
        title={t('statistics_mood_peaks_positive')}
        subtitle={t('statistics_mood_peaks_positive_description', { date: date.format('MMMM, YYYY') })}
        isShareable={true}
      >
        {dataPositive.items.length < 1 && (
          <NotEnoughDataOverlay />
        )}
        {dataPositive.items.length > 0 ? (
          <MoodPeaksContent
            data={dataPositive}
            startDate={monthStart}
            endDate={monthEnd} />
        ) : (
          <MoodPeaksContent
            data={dataPositiveDummy}
            startDate={monthStart}
            endDate={monthEnd} />
        )}
      </BigCard>
      <BigCard
        title={t('statistics_mood_peaks_negative')}
        subtitle={t('statistics_mood_peaks_negative_description', { date: date.format('MMMM, YYYY') })}
        isShareable={true}
      >
        {dataNegative.items.length < 1 && (
          <NotEnoughDataOverlay />
        )}
        {dataNegative.items.length > 0 ? (
          <MoodPeaksContent
            data={dataNegative}
            startDate={monthStart}
            endDate={monthEnd} />
        ) : (
          <MoodPeaksContent
            data={dataNegativeDummy}
            startDate={monthStart}
            endDate={monthEnd} />
        )}

      </BigCard>
    </>
  );
};
