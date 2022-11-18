import dayjs from 'dayjs';
import { BigCard } from '../../components/BigCard';
import { DATE_FORMAT } from '../../constants/Config';
import { t } from '../../helpers/translation';
import { getMoodPeaksNegativeData, getMoodPeaksPositiveData } from '../../hooks/useStatistics/MoodPeaks';
import { MoodPeaksContent } from '../Statistics/MoodPeaksCards';

export const MoodPeaks = ({
  date, items,
}) => {
  return (
    <>
      <BigCard
        title={t('statistics_mood_peaks_positive')}
        subtitle={t('statistics_mood_peaks_positive_description', { date: date.format('MMMM, YYYY') })}
        isShareable={true}
      >
        <MoodPeaksContent
          data={getMoodPeaksPositiveData(items)}
          startDate={dayjs(date).startOf('month').format(DATE_FORMAT)}
          endDate={dayjs(date).endOf('month').format(DATE_FORMAT)} />
      </BigCard>
      <BigCard
        title={t('statistics_mood_peaks_negative')}
        subtitle={t('statistics_mood_peaks_negative_description', { date: date.format('MMMM, YYYY') })}
        isShareable={true}
      >
        <MoodPeaksContent
          data={getMoodPeaksNegativeData(items)}
          startDate={dayjs(date).startOf('month').format(DATE_FORMAT)}
          endDate={dayjs(date).endOf('month').format(DATE_FORMAT)} />
      </BigCard>
    </>
  );
};
