import { MAX_TAG_LENGTH } from "@/constants/config";
import type { LogItem } from "@/features/logs";
import type { Person } from "@/features/people";
import type { Tag } from "@/features/tags";
import { getDays, getPeriodDays } from "../days";
import { getPeriod } from "../period";
import type { DateKey, PeriodKind, RecapInput } from "../types";
import { getToday } from "../use-recap-input";
import { buildMonthStory, buildWeekStory } from "./deck";
import { SLIDE_CASES } from "./slide-cases";
import type { CaseKit } from "./slide-cases";
import type { SlideContext } from "./slides";
import type { StorySlide, StorySlideType } from "./types";

/** Data of one period: a day inside it and every entry, tag, and person. */
export interface PlaygroundData {
  date: DateKey;
  items: LogItem[];
  tags: Tag[];
  people: Person[];
}

/** Slide types in deck order, so the list matches the stories. */
const SLIDE_TYPES = Object.keys(SLIDE_CASES).filter(
  (key): key is StorySlideType => key in SLIDE_CASES
);

/**
 * Decks to open, in list sections: every case and each story first, then
 * per slide type all its cases, and each case alone as `<type>/<index>`.
 */
export const PLAYGROUND_SECTIONS = [
  {
    title: "Recap story",
    decks: [
      { id: "all", title: "All slide states" },
      { id: "week", title: "Week story" },
      { id: "month", title: "Month story" },
    ],
  },
  ...SLIDE_TYPES.map((type) => ({
    title: type,
    decks: [
      ...(SLIDE_CASES[type].length > 1
        ? [{ id: type, title: `All (${SLIDE_CASES[type].length})` }]
        : []),
      ...SLIDE_CASES[type].map((slideCase, index) => ({
        id: `${type}/${index}`,
        title: slideCase.name,
      })),
    ],
  })),
];

const LONG_TAG: Tag = {
  id: "playground-long-tag",
  title: "Long walks along the riverbank".slice(0, MAX_TAG_LENGTH),
  color: "teal",
};

const LONG_PERSON: Person = {
  id: "playground-long-person",
  name: "Maximiliane von Hohenstein".slice(0, MAX_TAG_LENGTH),
  avatar: null,
  createdAt: "2026-01-01T09:00:00.000Z",
};

/** Recap input as the story screen builds it, with every step on. */
const toInput = (
  data: PlaygroundData,
  kind: PeriodKind,
  weekLocale: string
): RecapInput => {
  const history = getDays(data.items);
  const period = getPeriod(kind, data.date, weekLocale);
  const steps = new Set([
    "emotions",
    "tags",
    "people",
    "photos",
    "sleep",
    "message",
  ] as const);
  return {
    period,
    today: getToday(),
    firstEntryDate: history[0]?.date ?? null,
    days: getPeriodDays(history, period),
    history,
    locationEnabled: true,
    steps,
    availableSteps: steps,
    reminderEnabled: true,
    tags: data.tags,
    tagCategories: [],
    personIds: new Set(data.people.map((person) => person.id)),
  };
};

const toContext = (
  data: PlaygroundData,
  input: RecapInput,
  isDark: boolean
): SlideContext => ({
  period: input.period,
  days: input.days,
  history: input.history,
  today: input.today,
  tags: new Map([...data.tags, LONG_TAG].map((tag) => [tag.id, tag])),
  people: new Map(
    [...data.people, LONG_PERSON].map((person) => [person.id, person])
  ),
  isDark,
});

const toKit = (data: PlaygroundData, input: RecapInput): CaseKit => ({
  period: input.period,
  tagIds: data.tags.map((tag) => tag.id),
  personIds: data.people.map((person) => person.id),
  photos: input.days.flatMap((day) =>
    day.items.flatMap((item) =>
      item.photos.map((photo) => ({ date: day.date, photo }))
    )
  ),
  longTagId: LONG_TAG.id,
  longPersonId: LONG_PERSON.id,
});

/** One slide of a deck, with the context of its own period. */
export interface PlaygroundPage {
  slide: StorySlide;
  ctx: SlideContext;
  label: string;
}

/** Slides of `deck`, each with the context of its period. */
export const getPlaygroundPages = (
  deck: string,
  data: Record<"week" | "month", PlaygroundData>,
  isDark: boolean,
  weekLocale: string
): PlaygroundPage[] => {
  const periods = {
    week: toInput(data.week, "week", weekLocale),
    month: toInput(data.month, "month", weekLocale),
  };
  const ctxOf = (kind: "week" | "month") =>
    toContext(data[kind], periods[kind], isDark);
  if (deck === "week" || deck === "month") {
    const story =
      deck === "week"
        ? buildWeekStory(periods.week)
        : buildMonthStory(periods.month);
    const ctx = ctxOf(deck);
    return (story ?? []).map((slide) => ({ slide, ctx, label: slide.type }));
  }
  // `<type>` plays every case of the type, `<type>/<index>` one case.
  const [deckType, caseIndex] = deck.split("/");
  const types = SLIDE_TYPES.filter(
    (type) => deck === "all" || deckType === type
  );
  return types.flatMap((type) =>
    SLIDE_CASES[type].flatMap((slideCase, index) =>
      caseIndex === undefined || String(index) === caseIndex
        ? [
            {
              slide: slideCase.build(
                toKit(data[slideCase.period], periods[slideCase.period])
              ),
              ctx: ctxOf(slideCase.period),
              label: `${type}: ${slideCase.name}`,
            },
          ]
        : []
    )
  );
};
