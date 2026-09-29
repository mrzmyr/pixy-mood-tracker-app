import dayjs from "dayjs";
import {
  FIXTURES,
  getFixture,
  getFixtureData,
  getStorageFixtureEntries,
  STORAGE_FIXTURES,
} from "@/dev/fixtures";
import { getJSONSchemaType, migrateImportData } from "@/features/datagate";

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
      expect(getJSONSchemaType(migrateImportData(fixture.data))).toBe("pixy");
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
