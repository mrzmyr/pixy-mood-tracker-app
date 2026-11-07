import dayjs from "dayjs";
import type { ImportData } from "@/features/datagate";
import type { PlaygroundData } from "@/features/recaps/playground";
import { getFixture, getFixtureData } from "@/dev/fixtures";

/** One fixture export and a day inside its story period. */
interface PlaygroundFixture {
  data: ImportData;
  date: string;
}

/** Recap story fixture for the playground. It covers last month. */
export const getPlaygroundFixture = (
  today = dayjs()
): PlaygroundFixture | null => {
  const fixture = getFixture("recap-story");
  if (!fixture) {
    return null;
  }
  return {
    data: getFixtureData(fixture, today),
    date: today.subtract(1, "month").startOf("month").format("YYYY-MM-DD"),
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
