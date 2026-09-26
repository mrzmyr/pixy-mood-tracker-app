import dayjs from "dayjs";
import type { ImportData } from "@/features/datagate/import";
import empty from "./empty.json";
import fresh from "./fresh.json";
import seed from "./seed.json";
import year from "./year.json";

type FixtureFile = typeof fresh | typeof empty | typeof seed | typeof year;

// JSON imports widen string unions and fixtures omit default settings, so
// their types never match ImportData. The regular import validates them.
const asExport = (file: FixtureFile) =>
  // SAFETY: fixture files are Pixy exports; src/__tests__/dev-fixtures.ts checks each against pixySchema.
  // oxlint-disable-next-line anti-slop/no-chained-type-assertions -- see comment above.
  file as unknown as ImportData;

/**
 * Named test data set in the Pixy export format. To add one, export data
 * from Settings > Data, save the file here, and register it below.
 */
export interface Fixture {
  /** Stable ID used by `<scheme>://dev/fixture?id=<id>` and e2e flows. */
  id: string;
  title: string;
  description: string;
  /** Opens onboarding after loading instead of the calendar. */
  isFresh?: boolean;
  /** Shifts every date so the newest entry lands on today. */
  endsToday?: boolean;
  data: ImportData;
}

/** Every fixture, in the order the Test data screen lists them. */
export const FIXTURES: Fixture[] = [
  {
    id: "fresh",
    title: "Fresh install",
    description: "No data. Opens onboarding.",
    isFresh: true,
    data: asExport(fresh),
  },
  {
    id: "empty",
    title: "Empty",
    description: "Onboarding done, no entries or tags.",
    data: asExport(empty),
  },
  {
    id: "seed",
    title: "E2E seed",
    description: "15 entries on fixed dates, including 2023-09-24.",
    data: asExport(seed),
  },
  {
    id: "year",
    title: "One year",
    description:
      "365 entries ending today, with notes, emotions, sleep, and 5 tags.",
    endsToday: true,
    data: asExport(year),
  },
];

/** Looks up a fixture by ID, or `null` for an unknown ID. */
export const getFixture = (id: string) =>
  FIXTURES.find((fixture) => fixture.id === id) ?? null;

/** Returns the fixture's import data, shifted to today when `endsToday`. */
export const getFixtureData = (
  fixture: Fixture,
  today = dayjs()
): ImportData => {
  const items = Array.isArray(fixture.data.items) ? fixture.data.items : [];
  if (!fixture.endsToday || items.length === 0) {
    return fixture.data;
  }
  let newest = items[0].date;
  for (const item of items) {
    if (item.date > newest) {
      newest = item.date;
    }
  }
  const days = today.startOf("day").diff(dayjs(newest), "day");
  const shift = (value: string) => dayjs(value).add(days, "day");
  return {
    ...fixture.data,
    items: items.map((item) => ({
      ...item,
      date: shift(item.date).format("YYYY-MM-DD"),
      dateTime: shift(item.dateTime).toISOString(),
      createdAt: shift(item.createdAt).toISOString(),
    })),
  };
};
