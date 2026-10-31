import { addDays } from "../days";
import type { DateKey, Period } from "../types";
import type {
  StoryPhoto,
  StoryPlace,
  StorySlide,
  StorySlideType,
} from "./types";

/**
 * What a case reads from the playground data, so cases name real tags,
 * people, days, and photos. Lists never run empty: the playground loads
 * fixtures with all of them.
 */
export interface CaseKit {
  period: Period;
  /** Check-in days of the period, oldest first. */
  dates: DateKey[];
  tagIds: string[];
  personIds: string[];
  /** Photos of the period, oldest first. */
  photos: StoryPhoto[];
  /** Tag with a 30-character title, the longest a tag can have. */
  longTagId: string;
  /** Person with a 30-character name, the longest a name can have. */
  longPersonId: string;
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
const dateAt = (kit: CaseKit, index: number) =>
  pick(kit.dates, index, kit.period.start);
const photoAt = (kit: CaseKit, index: number) =>
  kit.photos.length > 0 ? pick(kit.photos, index, kit.photos[0]) : null;

/** The 7 days of a week period with ratings, `null` for no check-in. */
const weekDays = (kit: CaseKit, ratings: (number | null)[]) =>
  ratings.map((rating, index) => ({
    date: addDays(kit.period.start, index),
    rating,
  }));

const place = (
  name: string,
  latitude: number,
  longitude: number,
  days: number,
  rating: number,
  photo: StoryPhoto | null
): StoryPlace => ({ name, latitude, longitude, days, rating, photo });

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
      name: "Photo grid",
      period: "month",
      build: (kit) => ({
        type: "cover",
        variant: "photos",
        checkIns: kit.dates.length,
        photos: kit.photos,
      }),
    },
    {
      name: "Full-screen photos",
      period: "month",
      build: (kit) => ({
        type: "cover",
        variant: "photo",
        checkIns: kit.dates.length,
        photos: kit.photos.slice(0, 5),
      }),
    },
    {
      name: "Pixels",
      period: "month",
      build: (kit) => ({
        type: "cover",
        variant: "pixels",
        checkIns: kit.dates.length,
        photos: [],
      }),
    },
    {
      name: "Pixels, 1 check-in",
      period: "month",
      build: () => ({
        type: "cover",
        variant: "pixels",
        checkIns: 1,
        photos: [],
      }),
    },
  ],
  "best-day": [
    {
      name: "Photos",
      period: "week",
      build: (kit) => ({
        type: "best-day",
        date: dateAt(kit, 0),
        emotions: ["calm", "loved", "grateful"],
        photo: photoAt(kit, 0),
        photos: kit.photos.slice(0, 3),
        tagIds: [tagAt(kit, 0), tagAt(kit, 1), tagAt(kit, 2)],
        location: "Eimsbüttel, Hamburg",
      }),
    },
    {
      name: "Sky, no photo",
      period: "week",
      build: (kit) => ({
        type: "best-day",
        date: dateAt(kit, 2),
        emotions: ["excited"],
        photo: null,
        photos: [],
        tagIds: [tagAt(kit, 0)],
        location: null,
      }),
    },
    {
      name: "Long tag and place",
      period: "week",
      build: (kit) => ({
        type: "best-day",
        date: dateAt(kit, 1),
        emotions: ["in_awe", "grateful", "inspired"],
        photo: photoAt(kit, 1),
        photos: kit.photos.slice(1, 2),
        tagIds: [kit.longTagId, tagAt(kit, 0), tagAt(kit, 1)],
        location: "Prenzlauer Berg, Berlin-Pankow",
      }),
    },
  ],
  "week-mood": [
    {
      name: "Every day",
      period: "week",
      build: (kit) => ({
        type: "week-mood",
        days: weekDays(kit, [5, 4, 6, 2, 5, 6, 4]),
      }),
    },
    {
      name: "Gaps and a hard day",
      period: "week",
      build: (kit) => ({
        type: "week-mood",
        days: weekDays(kit, [4, null, 1, null, null, 5, 3]),
      }),
    },
  ],
  "top-emotions": [
    {
      name: "6 emotions",
      period: "week",
      build: () => ({
        type: "top-emotions",
        counts: [
          { emotion: "calm", days: 6 },
          { emotion: "loved", days: 4 },
          { emotion: "excited", days: 3 },
          { emotion: "grateful", days: 2 },
          { emotion: "relieved", days: 2 },
          { emotion: "stressed", days: 1 },
        ],
      }),
    },
    {
      name: "1 emotion",
      period: "week",
      build: () => ({
        type: "top-emotions",
        counts: [{ emotion: "calm", days: 2 }],
      }),
    },
  ],
  "close-by": [
    {
      name: "4 places",
      period: "week",
      build: (kit) => ({
        type: "close-by",
        places: [
          place("Eimsbüttel, Hamburg", 53.57, 9.95, 3, 5, photoAt(kit, 0)),
          place("Eppendorf, Hamburg", 53.588, 9.986, 1, 4, null),
          place("Ottensen, Hamburg", 53.552, 9.929, 1, 2, null),
          place("Winterhude, Hamburg", 53.583, 10.012, 1, 6, photoAt(kit, 1)),
        ],
      }),
    },
    {
      name: "1 place",
      period: "week",
      build: () => ({
        type: "close-by",
        places: [place("Eimsbüttel, Hamburg", 53.57, 9.95, 5, 4, null)],
      }),
    },
  ],
  "far-out": [
    {
      name: "Trip with home around",
      period: "week",
      build: (kit) => ({
        type: "far-out",
        trips: [
          place("Indre By, Copenhagen", 55.679, 12.577, 2, 6, photoAt(kit, 2)),
        ],
        around: [
          { latitude: 53.57, longitude: 9.95 },
          { latitude: 53.588, longitude: 9.986 },
        ],
      }),
    },
    {
      name: "2 trips, no photo",
      period: "week",
      build: () => ({
        type: "far-out",
        trips: [
          place("Strand, Travemünde", 53.96, 10.87, 2, 5, null),
          place("Altstadt, Lübeck", 53.866, 10.686, 1, 3, null),
        ],
        around: [],
      }),
    },
  ],
  "weekday-habit": [
    {
      name: "Up from last month",
      period: "month",
      build: (kit) => ({
        type: "weekday-habit",
        tagId: tagAt(kit, 1),
        weekday: 6,
        hits: 4,
        total: 4,
        previous: { hits: 1, total: 4 },
      }),
    },
    {
      name: "No month before, long tag",
      period: "month",
      build: (kit) => ({
        type: "weekday-habit",
        tagId: kit.longTagId,
        weekday: 2,
        hits: 3,
        total: 5,
        previous: null,
      }),
    },
  ],
  "made-of": [
    {
      name: "5 tags",
      period: "month",
      build: (kit) => ({
        type: "made-of",
        tagIds: [0, 1, 2, 3, 4].map((index) => tagAt(kit, index)),
      }),
    },
    {
      name: "1 long tag",
      period: "month",
      build: (kit) => ({ type: "made-of", tagIds: [kit.longTagId] }),
    },
  ],
  lifted: [
    {
      name: "3 tags",
      period: "month",
      build: (kit) => ({
        type: "lifted",
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
        type: "lifted",
        rows: [{ tagId: kit.longTagId, days: 3, delta: 0.5 }],
      }),
    },
  ],
  people: [
    {
      name: "4 people",
      period: "month",
      build: (kit) => ({
        type: "people",
        people: [0, 1, 2, 3].map((index) => ({
          personId: personAt(kit, index),
          days: kit.dates.filter((_, day) => day % (index + 1) === 0),
        })),
      }),
    },
    {
      name: "1 long name",
      period: "month",
      build: (kit) => ({
        type: "people",
        people: [{ personId: kit.longPersonId, days: kit.dates.slice(0, 3) }],
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
  "hard-pattern": [
    {
      name: "2 of 3 harder days",
      period: "month",
      build: (kit) => ({
        type: "hard-pattern",
        tagId: tagAt(kit, 5),
        hardDates: [dateAt(kit, 5), dateAt(kit, 19), dateAt(kit, 20)],
        tagHard: 2,
        otherDays: 27,
        tagOther: 1,
      }),
    },
    {
      name: "Every harder day, long tag",
      period: "month",
      build: (kit) => ({
        type: "hard-pattern",
        tagId: kit.longTagId,
        hardDates: [dateAt(kit, 3), dateAt(kit, 10)],
        tagHard: 2,
        otherDays: 12,
        tagOther: 0,
      }),
    },
  ],
  "first-city": [
    {
      name: "Photo and distance",
      period: "month",
      build: (kit) => ({
        type: "first-city",
        city: "Travemünde",
        date: dateAt(kit, 10),
        km: 62,
        photo: photoAt(kit, 3),
      }),
    },
    {
      name: "No home, no photo",
      period: "month",
      build: (kit) => ({
        type: "first-city",
        city: "Garmisch-Partenkirchen",
        date: dateAt(kit, 4),
        km: null,
        photo: null,
      }),
    },
  ],
  "vs-last": [
    {
      name: "Up and down",
      period: "month",
      build: (kit) => ({
        type: "vs-last",
        previousStart: addDays(kit.period.start, -30),
        rows: [
          { tagId: tagAt(kit, 1), days: 5, change: 4 },
          { tagId: tagAt(kit, 2), days: 8, change: 3 },
          { tagId: tagAt(kit, 4), days: 2, change: -3 },
        ],
      }),
    },
    {
      name: "1 long tag down",
      period: "month",
      build: (kit) => ({
        type: "vs-last",
        previousStart: addDays(kit.period.start, -30),
        rows: [{ tagId: kit.longTagId, days: 0, change: -5 }],
      }),
    },
  ],
  moments: [
    {
      name: "4 weeks",
      period: "month",
      build: (kit) => ({
        type: "moments",
        weeks: [0, 7, 14, 21].map((offset, week) => ({
          start: addDays(kit.period.start, offset),
          end:
            offset === 21
              ? kit.period.end
              : addDays(kit.period.start, offset + 6),
          photos: kit.photos.slice(week * 2, week * 2 + week + 1),
        })),
      }),
    },
    {
      name: "Empty weeks",
      period: "month",
      build: (kit) => ({
        type: "moments",
        weeks: [0, 7, 14, 21].map((offset, week) => ({
          start: addDays(kit.period.start, offset),
          end:
            offset === 21
              ? kit.period.end
              : addDays(kit.period.start, offset + 6),
          photos: week === 1 ? [] : kit.photos.slice(week, week + 1),
        })),
      }),
    },
  ],
  "came-back": [
    {
      name: "Emotions and tags",
      period: "month",
      build: (kit) => ({
        type: "came-back",
        emotions: [
          { emotion: "playful", lastDate: addDays(kit.period.start, -60) },
          { emotion: "proud", lastDate: addDays(kit.period.start, -45) },
        ],
        tags: [{ tagId: tagAt(kit, 2), days: 3, weeks: 6 }],
      }),
    },
    {
      name: "1 long tag",
      period: "month",
      build: (kit) => ({
        type: "came-back",
        emotions: [],
        tags: [{ tagId: kit.longTagId, days: 1, weeks: 12 }],
      }),
    },
  ],
  "coming-up": [
    {
      name: "Some missed",
      period: "month",
      build: () => ({ type: "coming-up", year: 2026, left: 61, missed: 23 }),
    },
    {
      name: "None missed",
      period: "month",
      build: () => ({ type: "coming-up", year: 2026, left: 1, missed: 0 }),
    },
  ],
  quiz: [
    {
      name: "Which ones are true",
      period: "month",
      build: (kit) => ({
        type: "quiz",
        quiz: "truths",
        module: "mix",
        statements: [
          {
            kind: "person",
            personId: personAt(kit, 0),
            days: 24,
            isTrue: true,
          },
          { kind: "tag", tagId: tagAt(kit, 0), days: 18, isTrue: true },
          {
            kind: "person",
            personId: personAt(kit, 1),
            days: 11,
            isTrue: false,
          },
          { kind: "tag", tagId: kit.longTagId, days: 4, isTrue: true },
        ],
        actual: 3,
      }),
    },
    {
      name: "Pick a person",
      period: "month",
      build: (kit) => ({
        type: "quiz",
        quiz: "people",
        personIds: [0, 1, 2].map((index) => personAt(kit, index)),
        answer: personAt(kit, 0),
        days: {
          [personAt(kit, 0)]: 24,
          [personAt(kit, 1)]: 18,
          [personAt(kit, 2)]: 3,
        },
      }),
    },
    {
      name: "Pick a tag",
      period: "month",
      build: (kit) => ({
        type: "quiz",
        quiz: "tags",
        tagIds: [tagAt(kit, 0), tagAt(kit, 1), kit.longTagId],
        answer: tagAt(kit, 0),
        days: {
          [tagAt(kit, 0)]: 25,
          [tagAt(kit, 1)]: 4,
          [kit.longTagId]: 2,
        },
      }),
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
};
