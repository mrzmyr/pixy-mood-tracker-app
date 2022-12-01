import dayjs from 'dayjs';
import _ from 'lodash';
import { BigCard } from '../../components/BigCard';
import { DATE_FORMAT } from '../../constants/Config';
import { t } from '../../helpers/translation';
import { LogDay, LogItem } from '../../hooks/useLogs';
import { getMoodPeaksNegativeData, getMoodPeaksPositiveData } from '../../hooks/useStatistics/MoodPeaks';
import { MoodPeaksContent } from '../Statistics/MoodPeaksCards';
import { NotEnoughDataOverlay } from '../../components/Statistics/NotEnoughDataOverlay';
import { useAnonymizer } from '../../hooks/useAnonymizer';
import { CardFeedback } from '../../components/Statistics/CardFeedback';

const MIN_ITEMS = 1;

export const MoodPeaks = ({
  date, items,
}) => {
  const { anonymizeDay } = useAnonymizer()

  const dataNegative = getMoodPeaksNegativeData(items);
  const dataPositive = getMoodPeaksPositiveData(items);

  const dataNegativeDummy: { days: LogDay[] } = {
    days: [{
      date: dayjs().format(DATE_FORMAT),
      ratingAvg: 'bad',
      items: [],
    }, {
      date: dayjs(date).add(4, 'day').format(DATE_FORMAT),
      ratingAvg: 'extremely_bad',
      items: [],
    }, {
      date: dayjs(date).add(8, 'day').format(DATE_FORMAT),
      ratingAvg: 'bad',
      items: [],
    }, {
      date: dayjs(date).add(12, 'day').format(DATE_FORMAT),
      ratingAvg: 'extremely_bad',
      items: [],
    }]
  }

  const dataPositiveDummy = {
    days: dataNegativeDummy.days.map((item) => ({
      ...item,
      ratingAvg: 'extremely_good' as LogDay['ratingAvg'],
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
        analyticsId="mood-peaks-positive"
      >
        {dataPositive.days.length < MIN_ITEMS && (
          <NotEnoughDataOverlay />
        )}
        {dataPositive.days.length >= MIN_ITEMS ? (
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
        <CardFeedback
          type='mood_peaks_positive_month_report'
          details={dataPositive.days.map(day => anonymizeDay(day))}
        />
      </BigCard>
      <BigCard
        title={t('statistics_mood_peaks_negative')}
        subtitle={t('statistics_mood_peaks_negative_description', { date: date.format('MMMM, YYYY') })}
        isShareable={true}
        analyticsId="mood-peaks-negative"
      >
        {dataNegative.days.length < MIN_ITEMS && (
          <NotEnoughDataOverlay />
        )}
        {dataNegative.days.length >= MIN_ITEMS ? (
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
        <CardFeedback
          type='mood_peaks_negative_month_report'
          details={dataNegative.days.map(day => anonymizeDay(day))}
        />
      </BigCard>
    </>
  );
};
