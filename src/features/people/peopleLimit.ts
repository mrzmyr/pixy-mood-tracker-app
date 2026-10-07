import { MAX_PEOPLE } from "@/constants/Config";
import { getItemLimit } from "@/lib/itemLimit";
import type { Person } from "./PeopleProvider";

/**
 * People cap state. Pass all stored people: archived people count toward
 * {@link MAX_PEOPLE}.
 */
export const getPeopleLimit = (people: readonly Person[]) =>
  getItemLimit(people, MAX_PEOPLE);
