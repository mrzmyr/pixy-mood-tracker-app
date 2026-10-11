import dayjs from "dayjs";
import { _generateItem } from "@/__tests__/utils";
import type { LogItem } from "@/features/logs";
import type { Person } from "@/features/people";
import type { Tag } from "@/features/tags";
import { buildHighlightsReport } from "../highlightsReport";
import type { StatisticId } from "../highlightsReport";

const NOW = new Date(2026, 9, 4, 12, 0, 0);

const tags: Tag[] = [
  { id: "work", title: "Work", color: "blue" },
  { id: "gym", title: "Gym", color: "green" },
];

const people: Person[] = [
  { id: "sam", name: "Sam", avatar: null, createdAt: "2026-01-01T00:00:00Z" },
];

/** Entry `daysAgo` days before `NOW`, at the same clock time. */
const entry = (daysAgo: number, extra: Partial<LogItem> = {}) =>
  _generateItem({
    dateTime: dayjs(NOW).subtract(daysAgo, "day").toISOString(),
    ...extra,
  });

/** One entry per day, starting today and going back. */
const entries = (count: number, extra: Partial<LogItem> = {}) =>
  Array.from({ length: count }, (_, daysAgo) => entry(daysAgo, extra));

const good = { rating: "good" } as const;
const bad = { rating: "bad" } as const;
const withTag = (id: string) => ({ tags: [{ id }] });
const withSam = { people: [{ id: "sam" }] };
const withEmotions = (...emotions: string[]) => ({ emotions });

// SAFETY: fixture mirrors persisted legacy logs whose sleep quality can be null.
const legacySleep = (quality: LogItem["sleep"]["quality"] | null) =>
  ({ quality }) as LogItem["sleep"];

const build = (items: LogItem[]) =>
  buildHighlightsReport({ items, tags, people, now: NOW });

describe("buildHighlightsReport()", () => {
  test.each([
    { count: 0, unlocked: false, missingEntries: 7 },
    { count: 6, unlocked: false, missingEntries: 1 },
    { count: 7, unlocked: true, missingEntries: 0 },
    { count: 10, unlocked: true, missingEntries: 0 },
  ])(
    "$count entries in the window: unlocked $unlocked, missing $missingEntries",
    ({ count, unlocked, missingEntries }) => {
      const report = build(entries(count));

      expect(report.unlocked).toBe(unlocked);
      expect(report.missingEntries).toBe(missingEntries);
    }
  );

  test("entries outside the window do not unlock", () => {
    const report = build([...entries(6), entry(15), entry(20)]);

    expect(report.itemsCount).toBe(6);
    expect(report.unlocked).toBe(false);
  });

  test.each([
    { name: "exactly 14 days before now", offset: 0, counts: true },
    { name: "1 ms before the window start", offset: -1, counts: false },
    { name: "at now", offset: 14 * 24 * 60 * 60 * 1000, counts: true },
    {
      name: "1 ms after now",
      offset: 14 * 24 * 60 * 60 * 1000 + 1,
      counts: false,
    },
  ])("entry $name counts: $counts", ({ offset, counts }) => {
    const start = dayjs(NOW).subtract(14, "day");
    const item = _generateItem({
      dateTime: start.add(offset, "millisecond").toISOString(),
    });

    expect(build([item]).itemsCount).toBe(counts ? 1 : 0);
  });

  test("window spans the local days from 14 days ago to today", () => {
    expect(build([]).window).toEqual({
      start: "2026-09-20",
      end: "2026-10-04",
    });
  });

  test.each<{
    name: string;
    id: StatisticId;
    items: LogItem[];
    available: boolean;
    highlighted: boolean;
  }>([
    {
      name: "no entries",
      id: "mood_avg",
      items: [],
      available: false,
      highlighted: false,
    },
    {
      name: "60% positive days",
      id: "mood_avg",
      items: [
        entry(0, good),
        entry(1, good),
        entry(2, good),
        ...[3, 4].map((d) => entry(d)),
      ],
      available: true,
      highlighted: false,
    },
    {
      name: "67% positive days",
      id: "mood_avg",
      items: [entry(0, good), entry(1, good), entry(2)],
      available: true,
      highlighted: true,
    },
    {
      name: "1 good day",
      id: "mood_peaks_positive",
      items: [entry(0, good), entry(1)],
      available: true,
      highlighted: false,
    },
    {
      name: "2 good days",
      id: "mood_peaks_positive",
      items: [entry(0, good), entry(1, good)],
      available: true,
      highlighted: true,
    },
    {
      name: "1 bad day",
      id: "mood_peaks_negative",
      items: [entry(0, bad), entry(1)],
      available: true,
      highlighted: false,
    },
    {
      name: "2 bad days",
      id: "mood_peaks_negative",
      items: [entry(0, bad), entry(1, bad)],
      available: true,
      highlighted: true,
    },
    {
      name: "tag on 2 entries",
      id: "tags_peaks",
      items: entries(2, withTag("work")),
      available: false,
      highlighted: false,
    },
    {
      name: "tag on 5 entries",
      id: "tags_peaks",
      items: entries(5, withTag("work")),
      available: true,
      highlighted: false,
    },
    {
      name: "tag on 6 entries",
      id: "tags_peaks",
      items: entries(6, withTag("work")),
      available: true,
      highlighted: true,
    },
    {
      name: "no tags",
      id: "tags_distribution",
      items: entries(3),
      available: false,
      highlighted: false,
    },
    {
      name: "tag on 1 entry",
      id: "tags_distribution",
      items: [entry(0, withTag("work"))],
      available: true,
      highlighted: true,
    },
    {
      name: "person on 4 entries",
      id: "people_peaks",
      items: [...entries(4, withSam), ...entries(4)],
      available: false,
      highlighted: false,
    },
    {
      name: "person without mood difference",
      id: "people_peaks",
      items: [...entries(5, withSam), ...entries(5)],
      available: true,
      highlighted: false,
    },
    {
      name: "person with mood difference of 0.5",
      id: "people_peaks",
      items: [...entries(5, { ...withSam, ...good }), ...entries(5)],
      available: true,
      highlighted: true,
    },
    {
      name: "person on 1 entry",
      id: "people_distribution",
      items: [entry(0, withSam)],
      available: true,
      highlighted: true,
    },
    {
      name: "3 emotions",
      id: "emotions_distribution",
      items: [entry(0, withEmotions("accomplished", "alive", "amazed"))],
      available: false,
      highlighted: false,
    },
    {
      name: "4 emotions, each used once",
      id: "emotions_distribution",
      items: [
        entry(0, withEmotions("accomplished", "alive", "amazed", "challenged")),
      ],
      available: true,
      highlighted: false,
    },
    {
      name: "4 emotions, one used 6 times",
      id: "emotions_distribution",
      items: [
        entry(0, withEmotions("accomplished", "alive", "amazed", "challenged")),
        ...entries(5, withEmotions("accomplished")),
      ],
      available: true,
      highlighted: true,
    },
    {
      name: "no sleep ratings",
      id: "sleep_quality_distribution",
      items: entries(3, {
        sleep: legacySleep(null),
      }),
      available: false,
      highlighted: false,
    },
    {
      name: "1 sleep rating",
      id: "sleep_quality_distribution",
      items: [entry(0)],
      available: true,
      highlighted: true,
    },
    {
      name: "3 entries",
      id: "mood_chart",
      items: entries(3),
      available: false,
      highlighted: false,
    },
    {
      name: "4 entries",
      id: "mood_chart",
      items: entries(4),
      available: true,
      highlighted: true,
    },
  ])("$id with $name", ({ id, items, available, highlighted }) => {
    expect(build(items).cards[id]).toEqual({ available, highlighted });
  });

  test("tag peaks list the most used tag first", () => {
    const report = build([
      ...entries(3, withTag("work")),
      ...entries(4, withTag("gym")),
    ]);

    expect(report.data.tagsPeaksData.tags.map((tag) => tag.id)).toEqual([
      "gym",
      "work",
    ]);
  });
});
