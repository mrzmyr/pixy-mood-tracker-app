import dayjs from "dayjs";
import { _generateItem } from "@/__tests__/utils";
import {
  getCameraCenter,
  getMapEntries,
  getMapPlaces,
} from "../screens/Calendar/Map/places";

const office = { latitude: 52.5297, longitude: 13.4014, name: "Mitte" };
const today = dayjs("2026-10-06T12:00:00");

describe("getMapEntries", () => {
  it("keeps entries with a place from the last 30 days, oldest first", () => {
    const newest = _generateItem({
      date: "2026-10-06",
      dateTime: "2026-10-06T09:00:00.000Z",
      location: office,
    });
    const oldestKept = _generateItem({
      date: "2026-09-07",
      dateTime: "2026-09-07T09:00:00.000Z",
      location: office,
    });
    const tooOld = _generateItem({
      date: "2026-09-06",
      dateTime: "2026-09-06T09:00:00.000Z",
      location: office,
    });
    const withoutPlace = _generateItem({
      date: "2026-10-05",
      dateTime: "2026-10-05T09:00:00.000Z",
    });

    const entries = getMapEntries(
      [newest, tooOld, withoutPlace, oldestKept],
      today
    );

    expect(entries.map((entry) => entry.id)).toEqual([
      oldestKept.id,
      newest.id,
    ]);
  });
});

describe("getCameraCenter", () => {
  it("moves the center south so the point shows above the middle", () => {
    const near = getCameraCenter(office, 14, 200);
    const zoomedOut = getCameraCenter(office, 10, 200);

    expect(near.longitude).toBe(office.longitude);
    expect(near.latitude).toBeLessThan(office.latitude);
    expect(office.latitude - zoomedOut.latitude).toBeGreaterThan(
      office.latitude - near.latitude
    );
  });
});

describe("getMapPlaces", () => {
  it("keeps one pin per spot with the newest entry there", () => {
    const older = _generateItem({
      date: "2026-10-01",
      dateTime: "2026-10-01T09:00:00.000Z",
      location: office,
    });
    const elsewhere = _generateItem({
      date: "2026-10-02",
      dateTime: "2026-10-02T09:00:00.000Z",
      location: { latitude: 52.5145, longitude: 13.3501, name: "Tiergarten" },
    });
    // A few meters from `older`: same spot.
    const newer = _generateItem({
      date: "2026-10-03",
      dateTime: "2026-10-03T09:00:00.000Z",
      location: { ...office, latitude: office.latitude + 0.00001 },
    });

    const places = getMapPlaces(
      getMapEntries([newer, older, elsewhere], today)
    );

    expect([...places.values()].map((entry) => entry.id)).toEqual([
      newer.id,
      elsewhere.id,
    ]);
  });
});
