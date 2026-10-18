import dayjs from "dayjs";
import { sortPeopleByUsage } from "../usage";

const NOW = dayjs("2026-10-03T12:00:00");
const at = (daysAgo: number) => NOW.subtract(daysAgo, "day").toISOString();

describe("sortPeopleByUsage()", () => {
  const people = [
    { id: "sam", name: "Sam" },
    { id: "alex", name: "Alex" },
    { id: "mia", name: "Mia" },
  ];

  test("puts the most used of the last 90 days first, then sorts by name", () => {
    const items = [
      { dateTime: at(1), people: [{ id: "mia" }] },
      { dateTime: at(2), people: [{ id: "mia" }, { id: "sam" }] },
      // Older than 90 days: does not count.
      { dateTime: at(120), people: [{ id: "alex" }, { id: "alex" }] },
    ];

    expect(sortPeopleByUsage(people, items, NOW).map((p) => p.id)).toEqual([
      "mia",
      "sam",
      "alex",
    ]);
  });

  test("sorts by name without entries", () => {
    expect(sortPeopleByUsage(people, [], NOW).map((p) => p.id)).toEqual([
      "alex",
      "mia",
      "sam",
    ]);
  });
});
