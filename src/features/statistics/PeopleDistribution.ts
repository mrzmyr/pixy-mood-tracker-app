import countBy from "lodash/countBy";
import type { LogItem } from "@/features/logs";
import type { Person } from "@/features/people";

/** Entry counts per person for the statistics people card, most seen first. */
export interface PeopleDistributionData {
  people: {
    id: string;
    details: Person;
    count: number;
  }[];
}

/** Empty state before statistics load. */
export const defaultPeopleDistributionData: PeopleDistributionData = {
  people: [],
};

/**
 * Count how many entries each person is on. People that are archived or
 * missing from `people` are dropped.
 */
export const getPeopleDistributionData = (
  items: LogItem[],
  people: Person[]
): PeopleDistributionData => {
  const distribution = countBy(
    items.flatMap((item) => item.people.map((reference) => reference.id))
  );
  const result = Object.keys(distribution)
    .flatMap((key) => {
      const details = people.find((person) => person.id === key);
      return details === undefined || details.isArchived
        ? []
        : [{ details, id: key, count: distribution[key] }];
    })
    .sort((a, b) => b.count - a.count);

  return { people: result };
};
