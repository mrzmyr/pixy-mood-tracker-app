import dayjs from "dayjs";
import {
  FIXTURES,
  getFixture,
  getFixtureData,
  getStorageFixtureEntries,
  STORAGE_FIXTURES,
} from "@/dev/fixtures";
import { CHAOS_MAX_ENTRIES_PER_DAY, withChaos } from "@/dev/fixtures/chaos";
import {
  MAX_MESSAGE_LENGTH,
  MAX_PEOPLE,
  MAX_TAG_LENGTH,
  MAX_TAGS,
  MIN_TAG_LENGTH,
} from "@/constants/Config";
import { decodeBackupData } from "@/features/datagate";
import { EMOTIONS } from "@/features/logger";
import { MAX_PHOTOS_PER_ENTRY } from "@/features/photos";

const requireFixture = (id: string) => {
  const fixture = getFixture(id);
  if (!fixture) {
    throw Object.assign(new Error(`Missing fixture ${id}`), {
      fix: "Register the fixture in src/dev/fixtures/index.ts.",
      status: "fixture_missing",
      why: "The test expects this fixture to exist.",
    });
  }
  return fixture;
};

describe("dev fixtures", () => {
  it.each(FIXTURES.map((fixture) => [fixture.id, fixture]))(
    "%s is a valid Pixy export",
    (_id, fixture) => {
      expect(decodeBackupData(fixture.data).ok).toBe(true);
    }
  );

  it("has unique IDs", () => {
    const ids = [...FIXTURES, ...STORAGE_FIXTURES].map((fixture) => fixture.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("shifts endsToday fixtures so the newest entry is today", () => {
    const { items } = getFixtureData(
      requireFixture("year"),
      dayjs("2030-01-15T12:00:00")
    );
    const dates = Array.isArray(items)
      ? items.map((item) => item.date).sort()
      : [];
    expect(dates.at(-1)).toBe("2030-01-15");
    expect(dates[0]).toBe("2029-01-16");
  });

  it("chaos fills every limit on its newest entry", () => {
    const { items, tags = [], people = [] } = requireFixture("chaos").data;
    const entries = Array.isArray(items) ? items : [];
    const [maxEntry] = entries;
    const enabledEmotions = EMOTIONS.filter((emotion) => !emotion.disabled);

    expect(tags).toHaveLength(MAX_TAGS);
    expect(people).toHaveLength(MAX_PEOPLE);
    expect(maxEntry.tags).toHaveLength(MAX_TAGS);
    expect(maxEntry.people).toHaveLength(MAX_PEOPLE);
    expect(maxEntry.photos).toHaveLength(MAX_PHOTOS_PER_ENTRY);
    expect(maxEntry.message).toHaveLength(MAX_MESSAGE_LENGTH);
    expect(new Set(maxEntry.emotions)).toEqual(
      new Set(enabledEmotions.map((emotion) => emotion.key))
    );
  });

  it("chaos has crowded days up to the maximum", () => {
    const { items } = requireFixture("chaos").data;
    const entries = Array.isArray(items) ? items : [];
    const perDay = new Map<string, typeof entries>();
    for (const entry of entries) {
      perDay.set(entry.date, [...(perDay.get(entry.date) ?? []), entry]);
    }
    const counts = [...perDay.values()].map((day) => day.length);
    const inRange = (min: number, max: number) =>
      counts.filter((count) => count >= min && count <= max).length;

    expect(Math.max(...counts)).toBe(CHAOS_MAX_ENTRIES_PER_DAY);
    expect(counts).toContain(CHAOS_MAX_ENTRIES_PER_DAY - 1);
    expect(inRange(10, 20)).toBeGreaterThanOrEqual(8);
    expect(inRange(2, 5)).toBeGreaterThanOrEqual(5);

    // The fullest day is a past day and carries heavy content.
    const newest = [...perDay.keys()].sort().at(-1);
    const maxDay = [...perDay.entries()].find(
      ([, day]) => day.length === CHAOS_MAX_ENTRIES_PER_DAY
    ) ?? ["", []];
    expect(maxDay[0]).not.toBe(newest);
    expect(maxDay[1].some((entry) => entry.photos.length > 0)).toBe(true);
    expect(maxDay[1].some((entry) => entry.tags.length >= 10)).toBe(true);
    expect(maxDay[1].some((entry) => entry.people.length >= 5)).toBe(true);
    expect(maxDay[1].some((entry) => entry.message.length > 1000)).toBe(true);
    expect(
      new Set(maxDay[1].map((entry) => entry.rating)).size
    ).toBeGreaterThan(1);
  });

  it("chaos entries have unique IDs and strictly increasing times per day", () => {
    const { items } = requireFixture("chaos").data;
    const entries = Array.isArray(items) ? items : [];
    const photoIds = entries.flatMap((entry) =>
      entry.photos.map((photo) => photo.id)
    );
    const ids = entries.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(photoIds).size).toBe(photoIds.length);

    const lastTime = new Map<string, number>();
    for (const entry of entries) {
      const time = Date.parse(entry.dateTime);
      expect(Number.isNaN(time)).toBe(false);
      expect(entry.dateTime.startsWith(entry.date)).toBe(true);
      expect(time).toBeGreaterThan(lastTime.get(entry.date) ?? -Infinity);
      lastTime.set(entry.date, time);
    }
  });

  it("chaos names fit the tag and person name limits", () => {
    const { tags = [], people = [] } = requireFixture("chaos").data;
    const lengths = [
      ...tags.map((tag) => tag.title.length),
      ...people.map((person) => person.name.length),
    ];
    expect(Math.min(...lengths)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...lengths)).toBeLessThanOrEqual(MAX_TAG_LENGTH);
    expect(
      Math.min(...tags.map((tag) => tag.title.length))
    ).toBeGreaterThanOrEqual(MIN_TAG_LENGTH);
  });

  it("chaos builds the same data on every load", () => {
    const empty = requireFixture("empty").data;
    expect(withChaos(empty)).toEqual(withChaos(empty));
  });

  it("keeps fixed dates for other fixtures", () => {
    const seed = requireFixture("seed");
    expect(getFixtureData(seed)).toBe(seed.data);
  });

  it.each(
    STORAGE_FIXTURES.filter((fixture) => fixture.rawLogs === undefined).map(
      (fixture) => [fixture.id, fixture]
    )
  )("%s writes all store keys with logs ending today", (_id, fixture) => {
    const entries = getStorageFixtureEntries(
      fixture,
      dayjs("2030-01-15T12:00:00")
    );
    expect(entries.map(([key]) => key)).toEqual([
      "PIXEL_TRACKER_LOGS",
      "PIXEL_TRACKER_SETTINGS",
      "PIXEL_TRACKER_TAGS",
    ]);
    // SAFETY: getStorageFixtureEntries stringifies `{ items }` for the logs key.
    const logs = JSON.parse(entries[0][1]) as {
      items: { date: string }[];
    };
    const dates = logs.items.map((item) => item.date).sort();
    expect(dates.at(-1)).toBe("2030-01-15");
    expect(logs.items).toHaveLength(8);
  });

  it("corrupt-logs writes unparsable logs and valid settings and tags", () => {
    const fixture = STORAGE_FIXTURES.find(({ id }) => id === "corrupt-logs");
    expect(fixture).toBeDefined();
    const entries = getStorageFixtureEntries(
      // SAFETY: asserted defined above.
      fixture as NonNullable<typeof fixture>
    );
    expect(() => JSON.parse(entries[0][1])).toThrow(SyntaxError);
    expect(() => JSON.parse(entries[1][1])).not.toThrow();
    expect(() => JSON.parse(entries[2][1])).not.toThrow();
  });
});
