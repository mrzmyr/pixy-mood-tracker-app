import { CARD_TYPES } from "./card-types";
import { introEmotions, introPeople, introPhotos } from "./cards/nudges";
import {
  emotionAgain,
  firstCity,
  personMoments,
  tagBack,
} from "./cards/moments";
import { dayRecap, emotions, mostConnected, places } from "./cards/summaries";
import { peopleMood, whatMoves } from "./cards/patterns";
import {
  bestMonth,
  moodChart,
  moodCount,
  moodDays,
  sleepChart,
  tagDays,
  tags,
  yearPixels,
} from "./cards/stats";
import { trendLocation, trendPeople, trendTags } from "./cards/changes";
import type { CardFamily, RecapCard, RecapInput } from "./types";

/** One card, several cards (one per person or tag), or none. */
type Rule = (input: RecapInput) => RecapCard | RecapCard[] | null;

const RULES: Rule[] = [
  personMoments,
  emotionAgain,
  firstCity,
  tagBack,
  dayRecap,
  yearPixels,
  bestMonth,
  moodChart,
  moodCount,
  moodDays,
  emotions,
  tags,
  tagDays,
  sleepChart,
  mostConnected,
  places,
  whatMoves,
  peopleMood,
  trendTags,
  trendPeople,
  trendLocation,
  introEmotions,
  introPeople,
  introPhotos,
];

const FAMILY_ORDER: CardFamily[] = [
  "moment",
  "summary",
  "pattern",
  "change",
  "nudge",
];

/**
 * Cards of `input.period`, in family order, only types that fit it. Inside
 * a family, rule order sets the order. No cards for periods that end
 * before the first entry.
 */
export const buildCards = (input: RecapInput): RecapCard[] => {
  if (
    input.firstEntryDate === null ||
    input.period.end < input.firstEntryDate
  ) {
    return [];
  }
  const cards: RecapCard[] = [];
  for (const rule of RULES) {
    for (const card of [rule(input) ?? []].flat()) {
      if (CARD_TYPES[card.type].periods.includes(input.period.kind)) {
        cards.push(card);
      }
    }
  }
  return cards.sort(
    (a, b) =>
      FAMILY_ORDER.indexOf(CARD_TYPES[a.type].family) -
      FAMILY_ORDER.indexOf(CARD_TYPES[b.type].family)
  );
};
