import { RATING_MAPPING } from "@/constants/Ratings";
import type { LogItem } from "@/features/logs";
import type { Person } from "@/features/people";

/** Entries a person needs before their average counts. */
export const PEOPLE_PEAKS_MIN_ENTRIES = 5;

/**
 * Average mood per person next to the overall average, both on a 1 to 7
 * scale (`RATING_MAPPING` plus one, so the worst rating is 1, not 0).
 */
export interface PeoplePeaksData {
  /** Mean of all entries in the window, 1 to 7; `null` without entries. */
  overallAvg: number | null;
  people: {
    details: Person;
    count: number;
    avg: number;
    /** `avg` minus `overallAvg`, positive when mood is better with the person. */
    delta: number;
  }[];
}

/** Empty state before statistics load. */
export const defaultPeoplePeaksData: PeoplePeaksData = {
  overallAvg: null,
  people: [],
};

const toScale = (rating: LogItem["rating"]) => RATING_MAPPING[rating] + 1;

const mean = (values: number[]) =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

const round1 = (value: number) => Math.round(value * 10) / 10;

/**
 * Compare the mood with each person to the overall mood. Only people on at
 * least {@link PEOPLE_PEAKS_MIN_ENTRIES} entries count; archived and
 * unknown people are dropped. Sorted by delta, best first.
 */
export const getPeoplePeaksData = (
  items: LogItem[],
  people: Person[]
): PeoplePeaksData => {
  if (items.length === 0) {
    return defaultPeoplePeaksData;
  }
  const overallAvg = mean(items.map((item) => toScale(item.rating)));

  const result = people.flatMap((person) => {
    if (person.isArchived) {
      return [];
    }
    const withPerson = items.filter((item) =>
      item.people.some((reference) => reference.id === person.id)
    );
    if (withPerson.length < PEOPLE_PEAKS_MIN_ENTRIES) {
      return [];
    }
    const avg = mean(withPerson.map((item) => toScale(item.rating)));
    return [
      {
        details: person,
        count: withPerson.length,
        avg: round1(avg),
        delta: round1(avg - overallAvg),
      },
    ];
  });

  return {
    overallAvg: round1(overallAvg),
    people: result.sort((a, b) => b.delta - a.delta),
  };
};
