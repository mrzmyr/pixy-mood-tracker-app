import type { Person } from "./people-provider";

const toWords = (name: string) => name.trim().split(/\s+/u);

/**
 * Short display names, same order as `names`: the first name. People who
 * share a first name get their last initial ("Anna K."). If that still
 * clashes, or a name has one word only, the full name stays. Display only;
 * stored names never change.
 */
export const toShortNames = (names: readonly string[]): string[] => {
  const words = names.map(toWords);
  const firstCounts = new Map<string, number>();
  for (const [first] of words) {
    firstCounts.set(first, (firstCounts.get(first) ?? 0) + 1);
  }
  const initialed = words.map(([first, ...rest], index) => {
    if ((firstCounts.get(first) ?? 0) < 2) {
      return first;
    }
    const initial = rest.at(-1)?.[0];
    return initial ? `${first} ${initial}.` : names[index].trim();
  });
  const initialedCounts = new Map<string, number>();
  for (const label of initialed) {
    initialedCounts.set(label, (initialedCounts.get(label) ?? 0) + 1);
  }
  return initialed.map((label, index) =>
    (initialedCounts.get(label) ?? 0) > 1 ? names[index].trim() : label
  );
};

/** {@link toShortNames} by person id. */
export const getShortNames = (
  people: readonly Pick<Person, "id" | "name">[]
): Map<string, string> => {
  const labels = toShortNames(people.map((person) => person.name));
  return new Map(people.map((person, index) => [person.id, labels[index]]));
};
