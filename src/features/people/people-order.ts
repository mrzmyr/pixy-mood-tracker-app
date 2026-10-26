import type { Person } from "./people-provider";

/**
 * Returns `people` in the order of `orderedIds`. People missing from
 * `orderedIds`, like archived ones, follow in their old order. Pure.
 */
export const reorderPeople = (
  people: Person[],
  orderedIds: Person["id"][]
): Person[] => {
  const rank = new Map(orderedIds.map((id, index) => [id, index]));
  return [...people].sort(
    (a, b) =>
      (rank.get(a.id) ?? orderedIds.length) -
      (rank.get(b.id) ?? orderedIds.length)
  );
};

/**
 * Ids of `people` with `personId` swapped with its neighbor at `offset`.
 * `null` when the person is missing or already at that edge. Pure.
 */
export const movePerson = (
  people: Person[],
  personId: Person["id"],
  offset: -1 | 1
): Person["id"][] | null => {
  const ids = people.map((person) => person.id);
  const index = ids.indexOf(personId);
  const target = index + offset;
  if (index === -1 || target < 0 || target >= ids.length) {
    return null;
  }
  [ids[index], ids[target]] = [ids[target], ids[index]];
  return ids;
};
