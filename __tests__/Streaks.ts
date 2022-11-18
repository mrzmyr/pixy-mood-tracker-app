import { uniqueId } from "lodash";
import MockDate from "mockdate";
import { LogItem } from "../hooks/useLogs";
import { getCurrentStreak, getLongestStreak } from "../hooks/useStatistics/Streaks";

export const _generateItem = (item: Partial<LogItem>) => {
  const newItem = {
    id: uniqueId(),
    rating: 'neutral' as LogItem['rating'],
    message: '🥹',
    date: '2020-01-01',
    createdAt: new Date().toISOString(),
    tags: [],
    ...item,
  };

  if (item.date && !item.createdAt) {
    newItem.createdAt = (new Date(item.date)).toISOString()
  }

  return newItem;
};

const testItems = [
  _generateItem({ date: '2021-01-01' }),
  _generateItem({ date: '2021-01-02' }),
  _generateItem({ date: '2021-01-03' }),
  _generateItem({ date: '2021-01-04' }),
  _generateItem({ date: '2021-01-05' }),

  _generateItem({ date: '2021-01-06' }),
  _generateItem({ date: '2021-01-07' }),
  _generateItem({ date: '2021-01-08' }),

  _generateItem({ date: '2022-01-01' }),
  _generateItem({ date: '2022-01-02' }),
  _generateItem({ date: '2022-01-03' }),

  _generateItem({ date: '2022-01-05' }),

  _generateItem({ date: '2022-01-08' }),
  _generateItem({ date: '2022-01-09' }),
  _generateItem({ date: '2022-01-10' }),
  _generateItem({ date: '2022-01-11' }),
  _generateItem({ date: '2022-01-12' }),
]

describe("utils", () => {
  beforeAll(() => {
    MockDate.set(new Date('2022-01-12'));
  });

  it("getCurrentStreak", () => {
    expect(getCurrentStreak(testItems)).toBe(5)
  });

  it('getLongestStreak', () => {
    expect(getLongestStreak(testItems)).toBe(8)
  });

  it('getCurrentStreak with no data for today', () => {
    expect(getCurrentStreak([
      _generateItem({ date: '2022-01-06' }),
      _generateItem({ date: '2022-01-07' }),
      _generateItem({ date: '2022-01-08' }),
      _generateItem({ date: '2022-01-09' }),
      _generateItem({ date: '2022-01-10' }),
    ])).toBe(0)
  });

  afterAll(() => {
    MockDate.reset();
  })
});