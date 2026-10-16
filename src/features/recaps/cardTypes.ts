import type { CardMeta, CardType, NudgeCard, RecapCard } from "./types";

const WEEK_MONTH: CardMeta["periods"] = ["week", "month"];

/** Family, modules, signal, and fitting recaps of every card type. */
export const CARD_TYPES: Record<CardType, CardMeta> = {
  "nudge-reminder": {
    family: "nudge",
    modules: ["mood"],
    signal: "strong",
    periods: ["week"],
  },
  "intro-emotions": {
    family: "nudge",
    modules: ["emotions"],
    signal: "strong",
    periods: WEEK_MONTH,
  },
  "intro-people": {
    family: "nudge",
    modules: ["people"],
    signal: "strong",
    periods: WEEK_MONTH,
  },
  "intro-photos": {
    family: "nudge",
    modules: ["photos"],
    signal: "strong",
    periods: WEEK_MONTH,
  },
  "intro-categories": {
    family: "nudge",
    modules: ["tags"],
    signal: "strong",
    periods: WEEK_MONTH,
  },
  "emotion-again": {
    family: "moment",
    modules: ["emotions"],
    signal: "strong",
    periods: WEEK_MONTH,
  },
  "emotion-absent": {
    family: "moment",
    modules: ["emotions"],
    signal: "medium",
    periods: ["week"],
  },
  "person-back": {
    family: "moment",
    modules: ["people"],
    signal: "strong",
    periods: WEEK_MONTH,
  },
  "person-new": {
    family: "moment",
    modules: ["people"],
    signal: "strong",
    periods: WEEK_MONTH,
  },
  "person-milestone": {
    family: "moment",
    modules: ["people"],
    signal: "strong",
    periods: WEEK_MONTH,
  },
  "first-city": {
    family: "moment",
    modules: ["location"],
    signal: "strong",
    periods: WEEK_MONTH,
  },
  "tag-back": {
    family: "moment",
    modules: ["tags"],
    signal: "strong",
    periods: WEEK_MONTH,
  },
  "sleep-turnaround": {
    family: "moment",
    modules: ["sleep"],
    signal: "medium",
    periods: ["week"],
  },
  "sleep-rough": {
    family: "moment",
    modules: ["sleep"],
    signal: "medium",
    periods: ["week"],
  },
};

/**
 * Stable id of a card: its type plus the person, tag, or emotion it is
 * about. Two cards of one type can show at once, for two people.
 */
export const getCardId = (card: RecapCard) => {
  const subject =
    ("personId" in card && card.personId) ||
    ("tagId" in card && card.tagId) ||
    ("emotion" in card && card.emotion) ||
    "";
  return `${card.type}:${subject}`;
};

/** Nudges offer an action; every other family asks for feedback. */
export const isNudgeCard = (card: RecapCard): card is NudgeCard =>
  CARD_TYPES[card.type].family === "nudge";
