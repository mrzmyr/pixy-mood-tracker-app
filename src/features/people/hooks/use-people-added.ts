import { useEffect, useRef } from "react";
import type { Person } from "../people-provider";

/**
 * Calls `onAdded` with people that show up in `people` after mount. A
 * screen that opens the person form on top of itself stays mounted, so
 * anyone new was just added there: the screen can select them.
 */
export const usePeopleAdded = (
  people: readonly Person[],
  onAdded: (added: Person[]) => void
) => {
  const knownIds = useRef<Set<string> | null>(null);
  if (knownIds.current === null) {
    knownIds.current = new Set(people.map((person) => person.id));
  }
  useEffect(() => {
    const known = knownIds.current;
    const added = people.filter((person) => !known?.has(person.id));
    if (added.length === 0) {
      return;
    }
    for (const person of added) {
      known?.add(person.id);
    }
    onAdded(added);
  }, [people, onAdded]);
};
