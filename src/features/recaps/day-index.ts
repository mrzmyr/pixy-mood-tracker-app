import { CARD_TYPES } from "./card-types";
import { parsePlace } from "./places";
import type { CardType, RecapDay, RecapInput } from "./types";

/** What a day holds, computed once so drivers only look things up. */
export interface DayIndex {
  tags: Set<string>;
  people: Set<string>;
  /** Every named place of the day, "District, City". */
  places: Set<string>;
}

const EMPTY: DayIndex = {
  tags: new Set(),
  people: new Set(),
  places: new Set(),
};

/** Index per day; `at(day)` returns an empty index for unknown days. */
export const indexDays = (days: RecapDay[]) => {
  const index = new Map<string, DayIndex>();
  for (const day of days) {
    index.set(day.date, {
      tags: new Set(
        day.items.flatMap((item) => item.tags.map((tag) => tag.id))
      ),
      people: new Set(
        day.items.flatMap((item) => item.people.map((person) => person.id))
      ),
      places: new Set(
        day.items.flatMap((item) => {
          const name = item.location?.name;
          return name && parsePlace(name) ? [name] : [];
        })
      ),
    });
  }
  return (day: RecapDay) => index.get(day.date) ?? EMPTY;
};

/** The card type fits the period of the input. */
export const fits = (input: RecapInput, type: CardType) =>
  CARD_TYPES[type].periods.includes(input.period.kind);
