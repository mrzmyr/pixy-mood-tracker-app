import type {
  CardMeta,
  CardType,
  ChangeCard,
  NudgeCard,
  PatternCard,
  RecapCard,
  SummaryCard,
} from "./types";

const ALL_PERIODS: CardMeta["periods"] = ["month", "year"];

/** Family, modules, signal, and fitting recaps of every card type. */
export const CARD_TYPES: Record<CardType, CardMeta> = {
  "intro-emotions": {
    family: "nudge",
    modules: ["emotions"],
    signal: "strong",
    periods: ["month"],
  },
  "intro-people": {
    family: "nudge",
    modules: ["people"],
    signal: "strong",
    periods: ["month"],
  },
  "intro-photos": {
    family: "nudge",
    modules: ["photos"],
    signal: "strong",
    periods: ["month"],
  },
  "emotion-again": {
    family: "moment",
    modules: ["emotions"],
    signal: "strong",
    periods: ["month"],
  },
  // One card for every person back, new, or at a milestone in the period.
  "people-moments": {
    family: "moment",
    modules: ["people"],
    signal: "strong",
    periods: ["month"],
  },
  "first-city": {
    family: "moment",
    modules: ["location"],
    signal: "strong",
    periods: ["month"],
  },
  "tag-back": {
    family: "moment",
    modules: ["tags"],
    signal: "strong",
    periods: ["month"],
  },
  "day-recap": {
    family: "summary",
    modules: ["mood", "photos"],
    signal: "strong",
    periods: ["month"],
  },
  "mood-chart": {
    family: "summary",
    modules: ["mood"],
    signal: "strong",
    periods: ["month"],
  },
  "mood-count": {
    family: "summary",
    modules: ["mood"],
    signal: "strong",
    periods: ["month"],
  },
  "mood-days": {
    family: "summary",
    modules: ["mood"],
    signal: "strong",
    periods: ["month"],
  },
  "sleep-chart": {
    family: "summary",
    modules: ["sleep"],
    signal: "strong",
    periods: ["month"],
  },
  tags: {
    family: "summary",
    modules: ["tags"],
    signal: "strong",
    periods: ["month"],
  },
  "tag-days": {
    family: "summary",
    modules: ["tags"],
    signal: "strong",
    periods: ["month"],
  },
  "year-pixels": {
    family: "summary",
    modules: ["mood"],
    signal: "strong",
    periods: ["year"],
  },
  "best-month": {
    family: "summary",
    modules: ["mood"],
    signal: "strong",
    periods: ["year"],
  },
  emotions: {
    family: "summary",
    modules: ["emotions"],
    signal: "strong",
    periods: ALL_PERIODS,
  },
  "most-connected": {
    family: "summary",
    modules: ["people"],
    signal: "strong",
    periods: ["month", "year"],
  },
  places: {
    family: "summary",
    modules: ["location"],
    signal: "strong",
    periods: ALL_PERIODS,
  },
  "what-moves": {
    family: "pattern",
    modules: ["tags", "mood"],
    signal: "strong",
    periods: ["year"],
  },
  "people-mood": {
    family: "pattern",
    modules: ["people", "mood"],
    signal: "medium",
    periods: ["year"],
  },
  "trend-tags": {
    family: "change",
    modules: ["tags", "mood"],
    signal: "strong",
    periods: ["year"],
  },
  "trend-people": {
    family: "change",
    modules: ["people", "mood"],
    signal: "strong",
    periods: ["year"],
  },
  "trend-location": {
    family: "change",
    modules: ["location", "mood"],
    signal: "strong",
    periods: ["year"],
  },
};

/**
 * Stable id of a card: its type plus the person, tag, or emotion it is
 * about. Two cards of one type can show at once, for two tags.
 */
export const getCardId = (card: RecapCard) => {
  const subject =
    ("personId" in card && card.personId) ||
    ("tagId" in card && card.tagId) ||
    ("emotion" in card && card.emotion) ||
    ("mode" in card && card.mode) ||
    "";
  return `${card.type}:${subject}`;
};

/** Nudges offer an action; every other family asks for feedback. */
export const isNudgeCard = (card: RecapCard): card is NudgeCard =>
  CARD_TYPES[card.type].family === "nudge";

/** Summaries describe the period: a day, emotions, people, places. */
export const isSummaryCard = (card: RecapCard): card is SummaryCard =>
  CARD_TYPES[card.type].family === "summary";

/** Patterns: a driver goes with an outcome over enough days. */
export const isPatternCard = (card: RecapCard): card is PatternCard =>
  CARD_TYPES[card.type].family === "pattern";

/** Changes: something grew or faded over the period. */
export const isChangeCard = (card: RecapCard): card is ChangeCard =>
  CARD_TYPES[card.type].family === "change";
