import type { CardMeta, CardType } from "./types";

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
};

/** Nudges only offer an action; every other family asks for feedback. */
export const hasFeedback = (type: CardType) =>
  CARD_TYPES[type].family !== "nudge";
