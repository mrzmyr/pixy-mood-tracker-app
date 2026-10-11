import { CARD_TYPES } from "./cardTypes";
import {
  introCategories,
  introEmotions,
  introPeople,
  introPhotos,
  nudgeReminder,
} from "./cards/nudges";
import type { CardFamily, RecapCard, RecapInput } from "./types";

type Rule = (input: RecapInput) => RecapCard | null;

const RULES: Rule[] = [
  nudgeReminder,
  introEmotions,
  introPeople,
  introPhotos,
  introCategories,
];

const FAMILY_ORDER: CardFamily[] = [
  "moment",
  "summary",
  "pattern",
  "change",
  "nudge",
];

/**
 * Cards of `input.period`, in family order, only types that fit it. No
 * cards for periods that end before the first entry.
 */
export const buildCards = (input: RecapInput): RecapCard[] => {
  if (
    input.firstEntryDate === null ||
    input.period.end < input.firstEntryDate
  ) {
    return [];
  }
  return RULES.map((rule) => rule(input))
    .filter(
      (card): card is RecapCard =>
        card !== null &&
        CARD_TYPES[card.type].periods.includes(input.period.kind)
    )
    .sort(
      (a, b) =>
        FAMILY_ORDER.indexOf(CARD_TYPES[a.type].family) -
        FAMILY_ORDER.indexOf(CARD_TYPES[b.type].family)
    );
};
