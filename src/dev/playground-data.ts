import dayjs from "dayjs";
import type { ImportData } from "@/features/datagate";
import type { PlaygroundData } from "@/features/recaps/playground";
import { getFixture, getFixtureData } from "@/dev/fixtures";
import { withRecapWeekStory } from "@/dev/fixtures/recap-story";

/** Week and month data of the recap story playground. */
export type PlaygroundSets = Record<"week" | "month", PlaygroundData>;

/** One fixture export and a day inside its story period. */
interface PlaygroundFixture {
  data: ImportData;
  date: string;
}

/**
 * Recap story fixtures for the playground. The month fixture covers last
 * month. The week fixture covers the 7 days before its `today`, so it is
 * built to end on the last full calendar week of `weekLocale`: a week
 * story reads only days inside its calendar week.
 */
export const getPlaygroundFixtures = (
  weekLocale: string,
  today = dayjs()
): Record<"week" | "month", PlaygroundFixture> | null => {
  const fixture = getFixture("recap-story");
  if (!fixture) {
    return null;
  }
  const month = getFixtureData(fixture, today);
  const weekStart = today.locale(weekLocale).subtract(7, "day").startOf("week");
  return {
    month: {
      data: month,
      date: today.subtract(1, "month").startOf("month").format("YYYY-MM-DD"),
    },
    week: {
      data: withRecapWeekStory(month, weekStart.add(7, "day")),
      date: weekStart.format("YYYY-MM-DD"),
    },
  };
};

/** Fixture export as playground data. People show without avatars. */
export const toPlaygroundData = ({
  data,
  date,
}: PlaygroundFixture): PlaygroundData => ({
  date,
  items: Array.isArray(data.items) ? data.items : Object.values(data.items),
  tags: data.tags ?? [],
  people: (data.people ?? []).map((person) => ({ ...person, avatar: null })),
});
