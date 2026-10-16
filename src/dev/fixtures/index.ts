import dayjs from "dayjs";
import type { ExportPerson, ImportData } from "@/features/datagate";
import empty from "@/dev/fixtures/empty.json";
import fresh from "@/dev/fixtures/fresh.json";
import legacy168 from "@/dev/fixtures/legacy-1.68.json";
import legacy181 from "@/dev/fixtures/legacy-1.81.1.json";
import seed from "@/dev/fixtures/seed.json";
import year from "@/dev/fixtures/year.json";
import { withMenstruation } from "@/dev/fixtures/menstruation";
import { withTimeline } from "@/dev/fixtures/timeline";
import { FIXTURE_AVATAR_BASE64 } from "@/dev/fixtures/avatar";
import { withChaos } from "@/dev/fixtures/chaos";

type FixtureFile = typeof fresh | typeof empty | typeof seed | typeof year;

// JSON imports widen string unions and fixtures omit default settings, so
// their types never match ImportData. The regular import validates them.
const asExport = (file: FixtureFile) =>
  // SAFETY: fixture files are Pixy exports; src/__tests__/dev-fixtures.ts checks each against pixySchema.
  // oxlint-disable-next-line anti-slop/no-chained-type-assertions -- see comment above.
  file as unknown as ImportData;

/** Fixed ids so e2e flows and tests can reference fixture people. */
export const FIXTURE_PEOPLE_IDS = {
  sam: "7f1d6a3e-0001-4a3e-8f6e-0f0000000001",
  alex: "7f1d6a3e-0002-4a3e-8f6e-0f0000000002",
  mia: "7f1d6a3e-0003-4a3e-8f6e-0f0000000003",
} as const;

const FIXTURE_PEOPLE: ExportPerson[] = [
  {
    id: FIXTURE_PEOPLE_IDS.sam,
    name: "Sam",
    avatar: { base64: FIXTURE_AVATAR_BASE64, mime: "image/jpeg" },
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: FIXTURE_PEOPLE_IDS.alex,
    name: "Alex",
    avatar: null,
    createdAt: "2026-01-02T00:00:00.000Z",
  },
  {
    id: FIXTURE_PEOPLE_IDS.mia,
    name: "Mia",
    avatar: null,
    isArchived: true,
    createdAt: "2026-01-03T00:00:00.000Z",
  },
];

/**
 * Adds three people to an export and references them on a fixed share of
 * entries: Sam on every 3rd, Alex on every 4th, Mia (archived) on every 7th.
 */
const withPeople = (data: ImportData): ImportData => {
  const items = Array.isArray(data.items)
    ? data.items
    : Object.values(data.items);
  return {
    ...data,
    people: FIXTURE_PEOPLE,
    items: items.map((item, index) => ({
      ...item,
      people: [
        ...(index % 3 === 0 ? [{ id: FIXTURE_PEOPLE_IDS.sam }] : []),
        ...(index % 4 === 0 ? [{ id: FIXTURE_PEOPLE_IDS.alex }] : []),
        ...(index % 7 === 0 ? [{ id: FIXTURE_PEOPLE_IDS.mia }] : []),
      ],
    })),
  };
};

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
    id: "menstruation",
    title: "Menstruation",
    description: "Every daily flow and one day without a value. Step off.",
    endsToday: true,
    data: withMenstruation(asExport(empty)),
  },
  {
    id: "year",
    title: "One year",
    description:
      "365 entries ending today, with notes, emotions, sleep, and 5 tags.",
    endsToday: true,
    data: asExport(year),
  },
  {
    id: "people",
    title: "One year with people",
    description:
      "The `year` fixture plus 3 people (one with photo, one archived) on a fixed share of entries.",
    endsToday: true,
    data: withPeople(asExport(year)),
  },
  {
    id: "timeline",
    title: "Timeline",
    description:
      "One week ending today: several entries a day, places, photos, both together, long notes, and many chips.",
    endsToday: true,
    data: withTimeline(withPeople(asExport(empty))),
  },
  {
    id: "chaos",
    title: "Chaos",
    description:
      "Stress test ending today: every limit at max (50 tags, 50 people, 6 photos, 10,000-character note, all emotions), many scripts and emoji, years with gaps, 24 entries on the newest day, and past days with up to 100 entries.",
    endsToday: true,
    data: withChaos(asExport(empty)),
  },
];

/** Looks up a fixture by ID, or `null` for an unknown ID. */
export const getFixture = (id: string) =>
  FIXTURES.find((fixture) => fixture.id === id) ?? null;

interface DatedItem {
  date: string;
  dateTime: string;
  createdAt: string;
}

// Shifts every date so the newest item lands on `today`.
const shiftToToday = <T extends DatedItem>(items: T[], today: dayjs.Dayjs) => {
  if (items.length === 0) {
    return items;
  }
  let newest = items[0].date;
  for (const item of items) {
    if (item.date > newest) {
      newest = item.date;
    }
  }
  const days = today.startOf("day").diff(dayjs(newest), "day");
  const shift = (value: string) => dayjs(value).add(days, "day");
  return items.map((item) => ({
    ...item,
    date: shift(item.date).format("YYYY-MM-DD"),
    dateTime: shift(item.dateTime).toISOString(),
    createdAt: shift(item.createdAt).toISOString(),
  }));
};

/** Returns the fixture's import data, shifted to today when `endsToday`. */
export const getFixtureData = (
  fixture: Fixture,
  today = dayjs()
): ImportData => {
  const items = Array.isArray(fixture.data.items) ? fixture.data.items : [];
  if (!fixture.endsToday || items.length === 0) {
    return fixture.data;
  }
  return { ...fixture.data, items: shiftToToday(items, today) };
};

/**
 * Raw AsyncStorage values as an old app version wrote them. Loading one
 * skips the import, so the next app start reads it like an upgrade does.
 */
export interface StorageFixture {
  /** Stable ID used by `<scheme>://dev/fixture?id=<id>` and e2e flows. */
  id: string;
  description: string;
  /** Value per AsyncStorage key, stored with `JSON.stringify`. */
  storage: {
    PIXEL_TRACKER_LOGS: { items: DatedItem[] };
    PIXEL_TRACKER_SETTINGS: object;
    PIXEL_TRACKER_TAGS: object;
  };
  /** Written as-is under `PIXEL_TRACKER_LOGS` instead of `storage`, e.g. corrupt JSON. */
  rawLogs?: string;
}

/** Storage of released versions that users still upgrade from. */
export const STORAGE_FIXTURES: StorageFixture[] = [
  {
    id: "legacy-1.81.1",
    description:
      "Storage of 1.81.1: sleep, archived tag, settings.tags leftover.",
    storage: legacy181,
  },
  {
    id: "legacy-1.68",
    description: "Storage of 1.68.x: no sleep, no archived tags.",
    storage: legacy168,
  },
  {
    id: "corrupt-logs",
    description:
      "Unreadable logs, 1.81.1 settings and tags. Shows the load error screen. Clear app data to recover.",
    storage: legacy181,
    rawLogs: '{"items":[',
  },
];

/** Looks up a storage fixture by ID, or `null` for an unknown ID. */
export const getStorageFixture = (id: string) =>
  STORAGE_FIXTURES.find((fixture) => fixture.id === id) ?? null;

/** Returns key-value pairs for `AsyncStorage.multiSet`, logs shifted to today. */
export const getStorageFixtureEntries = (
  fixture: StorageFixture,
  today = dayjs()
): [string, string][] => {
  const { PIXEL_TRACKER_LOGS, PIXEL_TRACKER_SETTINGS, PIXEL_TRACKER_TAGS } =
    fixture.storage;
  return [
    [
      "PIXEL_TRACKER_LOGS",
      fixture.rawLogs ??
        JSON.stringify({
          ...PIXEL_TRACKER_LOGS,
          items: shiftToToday(PIXEL_TRACKER_LOGS.items, today),
        }),
    ],
    ["PIXEL_TRACKER_SETTINGS", JSON.stringify(PIXEL_TRACKER_SETTINGS)],
    ["PIXEL_TRACKER_TAGS", JSON.stringify(PIXEL_TRACKER_TAGS)],
  ];
};
