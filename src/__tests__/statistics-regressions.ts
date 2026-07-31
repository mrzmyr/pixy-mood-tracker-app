import { getSleepQualityDistributionForXDays } from '@/hooks/useStatistics/SleepQualityDistribution';
import { LogItem } from '@/hooks/useLogs';
import { getAverageSleepQuality, getWordCount } from '@/lib/utils';

const makeItem = (
  dateTime: string,
  quality: LogItem['sleep']['quality'] | null,
): LogItem => ({
  id: dateTime,
  date: dateTime.slice(0, 10),
  dateTime,
  createdAt: dateTime,
  rating: 'good',
  message: '',
  sleep: { quality } as LogItem['sleep'],
  emotions: [],
  tags: [],
});

describe('statistics regressions', () => {
  it('does not count blank messages as words', () => {
    expect(getWordCount('')).toBe(0);
    expect(getWordCount('   ')).toBe(0);
    expect(getWordCount('two   words')).toBe(2);
  });

  it('ignores entries without sleep data', () => {
    expect(getAverageSleepQuality([
      makeItem('2026-06-30T12:00:00.000Z', null),
    ])).toBeNull();
  });

  it('does not mix matching day numbers across months', () => {
    const data = getSleepQualityDistributionForXDays([
      makeItem('2026-06-30T12:00:00.000Z', 'good'),
      makeItem('2026-07-30T12:00:00.000Z', 'very_bad'),
    ], '2026-06-30', 1);

    expect(data[0].value).toBe(3);
    expect(data[0].count).toBe(1);
    expect(data[1].value).toBeNull();
  });
});
