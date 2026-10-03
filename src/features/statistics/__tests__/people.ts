import { _generateItem } from "@/__tests__/utils";
import type { Person } from "@/features/people";
import { getPeopleDistributionData } from "../PeopleDistribution";
import { getPeoplePeaksData, PEOPLE_PEAKS_MIN_ENTRIES } from "../PeoplePeaks";

const person = (id: string, extra: Partial<Person> = {}): Person => ({
  id,
  name: id,
  avatar: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  ...extra,
});

const people = [
  person("sam"),
  person("alex"),
  person("mia", { isArchived: true }),
];

const make = (id: string, rating: "good" | "bad") =>
  Array.from({ length: PEOPLE_PEAKS_MIN_ENTRIES }, () =>
    _generateItem({ rating, people: [{ id }] })
  );

describe("getPeopleDistributionData()", () => {
  test("counts entries per active known person, most seen first", () => {
    const items = [
      _generateItem({ people: [{ id: "sam" }, { id: "mia" }] }),
      _generateItem({ people: [{ id: "alex" }, { id: "sam" }] }),
      _generateItem({ people: [{ id: "alex" }, { id: "ghost" }] }),
      _generateItem({ people: [{ id: "alex" }] }),
    ];

    expect(getPeopleDistributionData(items, people)).toEqual({
      people: [
        { id: "alex", details: people[1], count: 3 },
        { id: "sam", details: people[0], count: 2 },
      ],
    });
  });
});

describe("getPeoplePeaksData()", () => {
  test("is empty without entries", () => {
    expect(getPeoplePeaksData([], people)).toEqual({
      overallAvg: null,
      people: [],
    });
  });

  test("compares the mood with a person to the overall mood on a 1 to 7 scale", () => {
    const withSam = Array.from({ length: PEOPLE_PEAKS_MIN_ENTRIES }, () =>
      _generateItem({ rating: "very_good", people: [{ id: "sam" }] })
    );
    const withAlex = Array.from({ length: PEOPLE_PEAKS_MIN_ENTRIES - 1 }, () =>
      _generateItem({ rating: "bad", people: [{ id: "alex" }] })
    );
    const alone = Array.from({ length: 5 }, () =>
      _generateItem({ rating: "neutral", people: [] })
    );

    const data = getPeoplePeaksData(
      [...withSam, ...withAlex, ...alone],
      people
    );

    // (5*6 + 4*3 + 5*4) / 14 = 4.4
    expect(data.overallAvg).toBe(4.4);
    // Alex has too few entries; Sam averages very_good = 6.
    expect(data.people).toEqual([
      { details: people[0], count: 5, avg: 6, delta: 1.6 },
    ]);
  });

  test("sorts by delta, best first, and skips archived people", () => {
    const data = getPeoplePeaksData(
      [...make("alex", "bad"), ...make("sam", "good"), ...make("mia", "good")],
      people
    );

    expect(data.people.map((entry) => entry.details.id)).toEqual([
      "sam",
      "alex",
    ]);
    expect(data.people[0].delta).toBeGreaterThan(0);
    expect(data.people[1].delta).toBeLessThan(0);
  });
});
