import { MAX_PEOPLE } from "@/constants/config";
import { getItemLimit } from "@/lib/item-limit";
import type { Person } from "./people-provider";

/**
 * People cap state. Pass all stored people: archived people count toward
 * {@link MAX_PEOPLE}.
 */
export const getPeopleLimit = (people: readonly Person[]) =>
  getItemLimit(people, MAX_PEOPLE);
