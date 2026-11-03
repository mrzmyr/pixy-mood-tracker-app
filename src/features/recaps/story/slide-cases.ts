import { addDays, daysBetween } from "../days";
import type { DateKey, Period } from "../types";
import type {
  PlacesTrip,
  RoughNight,
  SleepSlide,
  StoryPhoto,
  StorySlide,
  StorySlideType,
} from "./types";

/**
 * What a case reads from the playground data, so cases name real tags,
 * people, and photos. Lists never run empty: the playground loads fixtures
 * with all of them.
 */
export interface CaseKit {
  period: Period;
  tagIds: string[];
  personIds: string[];
  /** Photos of the period, oldest first. */
  photos: StoryPhoto[];
  /** Tag with a 30-character title, the longest a tag can have. */
  longTagId: string;
  /** Person with a 30-character name, the longest a name can have. */
  longPersonId: string;
  /** 60 made-up people without photos, for crowded slides. */
  crowdIds: string[];
  /** Best day of the month, as the month story picks it. */
  bestDate: DateKey;
}

/** One state of a slide: typical data, or an edge like one row or long names. */
export interface SlideCase {
  name: string;
  /** Period the slide belongs to: its context and days. */
  period: "week" | "month";
  build: (kit: CaseKit) => StorySlide;
}

/** Item `index` of `list`, wrapping around. */
const pick = <T>(list: T[], index: number, fallback: T): T =>
  list[index % Math.max(list.length, 1)] ?? fallback;

const tagAt = (kit: CaseKit, index: number) => pick(kit.tagIds, index, "");
const personAt = (kit: CaseKit, index: number) =>
  pick(kit.personIds, index, "");

/** Rough evening `index` of the month: every sixth day from the 3rd. */
const roughNightAt = (
  kit: CaseKit,
  index: number,
  fill: "typical" | "heavy" | "empty"
): RoughNight => {
  const evening = addDays(kit.period.start, 2 + index * 6);
  if (fill === "empty") {
    return {
      evening,
      quality: 1,
      tagIds: [],
      personIds: [],
      emotions: [],
      photos: [],
      note: "",
    };
  }
  if (fill === "heavy") {
    return {
      evening,
      quality: 1,
      tagIds: kit.tagIds.slice(0, 9),
      personIds: kit.personIds.slice(0, 5),
      emotions: [
        "tired",
        "stressed",
        "anxious",
        "overwhelmed",
        "calm",
        "grateful",
        "sad",
        "lonely",
      ],
      photos: kit.photos.slice(0, 5).map(({ photo }) => photo),
      note: "Long day. Kept going over tomorrow in my head.",
    };
  }
  return {
    evening,
    quality: index === 2 ? 0 : 1,
    tagIds: [tagAt(kit, 0), ...(index % 2 === 0 ? [tagAt(kit, 2)] : [])],
    personIds: index % 3 === 0 ? [] : [personAt(kit, index)],
    emotions: index % 2 === 0 ? ["tired", "stressed"] : [],
    photos: index === 1 ? kit.photos.slice(0, 1).map(({ photo }) => photo) : [],
    note: index === 3 ? "Long day. Kept going over tomorrow in my head." : "",
  };
};

/** Sleep slide of the month with 4 rough nights, or none to look at. */
const sleepCase = (
  kit: CaseKit,
  fill: "typical" | "heavy" | "empty" | "none" = "typical"
): SleepSlide => {
  const days = daysBetween(kit.period.start, kit.period.end) + 1;
  const roughNights =
    fill === "none"
      ? []
      : [0, 1, 2, 3].map((index) => roughNightAt(kit, index, fill));
  const rough = new Set(roughNights.map((night) => addDays(night.evening, 1)));
  return {
    type: "sleep",
    nights: Array.from({ length: days }, (_, index) => {
      const date = addDays(kit.period.start, index);
      return { date, quality: rough.has(date) ? 1 : 2 + (index % 3) };
    }).filter((_, index) => index % 9 !== 5),
    goodNights: 18,
    roughNights,
    items:
      fill === "none" || fill === "empty"
        ? []
        : [
            { kind: "tag", id: tagAt(kit, 0), nights: 4, isEveryday: false },
            { kind: "tag", id: tagAt(kit, 2), nights: 2, isEveryday: false },
            {
              kind: "person",
              id: personAt(kit, 1),
              nights: 2,
              isEveryday: false,
            },
          ],
    marked: [`tag:${tagAt(kit, 0)}`],
    suggestion: `tag:${tagAt(kit, 0)}`,
    steps: ["photos", "tags", "people", "emotions", "message"],
  };
};

const roughCase = (
  kit: CaseKit,
  fill: "typical" | "heavy" | "empty",
  position: number
) => {
  const sleep = sleepCase(kit, fill);
  const night = sleep.roughNights[position - 1] ?? roughNightAt(kit, 0, fill);
  return {
    type: "rough-night" as const,
    position,
    count: sleep.roughNights.length,
    night,
    sleep,
  };
};

/** Trip from day `from` (0 = period start) for `days` days. */
const trip = (
  kit: CaseKit,
  city: string,
  from: number,
  days: number
): PlacesTrip => {
  const dates = Array.from({ length: days }, (_, index) =>
    addDays(kit.period.start, from + index)
  );
  return {
    city,
    start: dates[0] ?? kit.period.start,
    end: dates.at(-1) ?? kit.period.start,
    dates,
  };
};

/**
 * Every slide type with its states. Typed by slide type, so a new type
 * without a case fails the type check.
 */
export const SLIDE_CASES: Record<StorySlideType, SlideCase[]> = {
  intro: [
    { name: "Welcome", period: "week", build: () => ({ type: "intro" }) },
  ],
  cover: [
    {
      name: "With photos",
      period: "month",
      build: (kit) => ({ type: "cover", checkIns: 30, photos: kit.photos }),
    },
    {
      name: "No photos",
      period: "month",
      build: () => ({ type: "cover", checkIns: 30, photos: [] }),
    },
    {
      name: "Week",
      period: "week",
      build: (kit) => ({ type: "cover", checkIns: 7, photos: kit.photos }),
    },
  ],
  places: [
    {
      name: "3 trips",
      period: "month",
      build: (kit) => ({
        type: "places",
        home: "Hamburg",
        awayDays: 6,
        homeDays: 19,
        trips: [
          trip(kit, "Copenhagen", 2, 3),
          trip(kit, "Berlin", 16, 2),
          trip(kit, "Lübeck", 24, 1),
        ],
      }),
    },
    {
      name: "On the move, 6 trips",
      period: "month",
      build: (kit) => ({
        type: "places",
        home: "Hamburg",
        awayDays: 19,
        homeDays: 6,
        trips: [
          trip(kit, "Amsterdam", 1, 3),
          trip(kit, "Brussels", 5, 2),
          trip(kit, "Paris", 8, 4),
          trip(kit, "Lyon", 13, 3),
          trip(kit, "Munich", 18, 3),
          trip(kit, "Garmisch-Partenkirchen", 22, 4),
        ],
      }),
    },
    {
      name: "1 day, never home",
      period: "month",
      build: (kit) => ({
        type: "places",
        home: "Hamburg",
        awayDays: 1,
        homeDays: 0,
        trips: [trip(kit, "Lübeck", 24, 1)],
      }),
    },
  ],
  "best-day": [
    {
      name: "Locked, then open",
      period: "month",
      build: (kit) => ({ type: "best-day", date: kit.bestDate }),
    },
  ],
  "positive-tags": [
    {
      name: "3 tags",
      period: "month",
      build: (kit) => ({
        type: "positive-tags",
        rows: [
          { tagId: tagAt(kit, 1), days: 4, delta: 1.4 },
          { tagId: tagAt(kit, 2), days: 8, delta: 0.8 },
          { tagId: tagAt(kit, 3), days: 6, delta: 0.3 },
        ],
      }),
    },
    {
      name: "1 long tag",
      period: "month",
      build: (kit) => ({
        type: "positive-tags",
        rows: [{ tagId: kit.longTagId, days: 3, delta: 0.5 }],
      }),
    },
  ],
  "negative-tags": [
    {
      name: "2 tags",
      period: "month",
      build: (kit) => ({
        type: "negative-tags",
        rows: [
          { tagId: tagAt(kit, 5), days: 3, delta: -1.2 },
          { tagId: tagAt(kit, 4), days: 12, delta: -0.4 },
        ],
      }),
    },
    {
      name: "1 long tag",
      period: "month",
      build: (kit) => ({
        type: "negative-tags",
        rows: [{ tagId: kit.longTagId, days: 2, delta: -0.6 }],
      }),
    },
  ],
  "people-quiz": [
    {
      name: "4 people",
      period: "month",
      build: (kit) => ({
        type: "people-quiz",
        people: [9, 24, 4, 18].map((days, index) => ({
          personId: personAt(kit, index),
          days,
        })),
        answer: personAt(kit, 1),
        insight: { kind: "tag", tagId: tagAt(kit, 0), days: 6 },
      }),
    },
    {
      name: "4 people, city",
      period: "month",
      build: (kit) => ({
        type: "people-quiz",
        people: [9, 24, 4, 18].map((days, index) => ({
          personId: personAt(kit, index),
          days,
        })),
        answer: personAt(kit, 1),
        insight: { kind: "place", city: "Travemünde", days: 3 },
      }),
    },
    {
      name: "3 people, long name",
      period: "month",
      build: (kit) => ({
        type: "people-quiz",
        people: [
          { personId: kit.longPersonId, days: 3 },
          { personId: personAt(kit, 0), days: 12 },
          { personId: personAt(kit, 1), days: 7 },
        ],
        answer: personAt(kit, 0),
        insight: null,
      }),
    },
  ],
  orbit: [
    {
      name: "6 people",
      period: "month",
      build: (kit) => ({
        type: "orbit",
        people: [24, 18, 9, 4, 3, 2].map((days, index) => ({
          personId: index === 5 ? kit.longPersonId : personAt(kit, index),
          days,
        })),
      }),
    },
    {
      name: "1 person",
      period: "month",
      build: (kit) => ({
        type: "orbit",
        people: [{ personId: personAt(kit, 0), days: 12 }],
      }),
    },
  ],
  "new-people": [
    {
      name: "1 person",
      period: "month",
      build: (kit) => ({
        type: "new-people",
        people: [{ personId: personAt(kit, 2), firstDate: kit.period.start }],
      }),
    },
    {
      name: "5 people, 1 long name",
      period: "month",
      build: (kit) => ({
        type: "new-people",
        people: [0, 1, 2, 3, 4].map((index) => ({
          personId: index === 4 ? kit.longPersonId : personAt(kit, index),
          firstDate: kit.period.start,
        })),
      }),
    },
    {
      name: "60 people",
      period: "month",
      build: (kit) => ({
        type: "new-people",
        people: kit.crowdIds.map((personId) => ({
          personId,
          firstDate: kit.period.start,
        })),
      }),
    },
  ],
  "coming-up": [
    {
      name: "61 days left",
      period: "month",
      build: () => ({ type: "coming-up", year: 2026, left: 61 }),
    },
    {
      name: "1 day left",
      period: "month",
      build: () => ({ type: "coming-up", year: 2026, left: 1 }),
    },
  ],
  share: [
    {
      name: "Shuffle photos",
      period: "month",
      build: (kit) => ({ type: "share", photos: kit.photos }),
    },
    {
      name: "No photos",
      period: "month",
      build: () => ({ type: "share", photos: [] }),
    },
  ],
  sleep: [
    {
      name: "Asks to look closer",
      period: "month",
      build: (kit) => sleepCase(kit),
    },
    {
      name: "Nothing to look at",
      period: "month",
      build: (kit) => sleepCase(kit, "none"),
    },
  ],
  "rough-night": [
    {
      name: "First night",
      period: "month",
      build: (kit) => roughCase(kit, "typical", 1),
    },
    {
      name: "Repeat marked",
      period: "month",
      build: (kit) => roughCase(kit, "typical", 3),
    },
    {
      name: "Max load",
      period: "month",
      build: (kit) => roughCase(kit, "heavy", 2),
    },
    {
      name: "Nothing logged",
      period: "month",
      build: (kit) => roughCase(kit, "empty", 1),
    },
  ],
  "rough-nights-all": [
    {
      name: "4 nights",
      period: "month",
      build: (kit) => ({ type: "rough-nights-all", sleep: sleepCase(kit) }),
    },
  ],
  "rough-nights-ask": [
    {
      name: "Tags and people",
      period: "month",
      build: (kit) => ({ type: "rough-nights-ask", sleep: sleepCase(kit) }),
    },
  ],
  "rough-nights-closing": [
    {
      name: "Closing",
      period: "month",
      build: () => ({ type: "rough-nights-closing" }),
    },
  ],
};
