import { _generateItem } from "@/__tests__/utils";
import { getSavedEntryProperties } from "../analytics";

const at = (day: number, hour = 12) =>
  new Date(2026, 9, day, hour).toISOString();
const NOW = new Date(2026, 9, 10, 20);

describe("getSavedEntryProperties()", () => {
  it("counts the new entry on its date and the days since that date", () => {
    const items = [
      _generateItem({ id: "a", dateTime: at(8, 9) }),
      _generateItem({ id: "b", dateTime: at(9) }),
    ];

    expect(
      getSavedEntryProperties({
        data: { id: "new", dateTime: at(8, 18), emotions: [] },
        items,
        now: NOW,
      })
    ).toEqual({
      advanced_emotions_count: 0,
      entry_days_ago: 2,
      entries_on_date: 2,
    });
  });

  it("counts an edited entry once", () => {
    const items = [_generateItem({ id: "a", dateTime: at(10, 9) })];

    expect(
      getSavedEntryProperties({
        data: { id: "a", dateTime: at(10, 9), emotions: [] },
        items,
        now: NOW,
      }).entries_on_date
    ).toBe(1);
  });
});
