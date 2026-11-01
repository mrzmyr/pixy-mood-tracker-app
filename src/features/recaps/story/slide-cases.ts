import type { Period } from "../types";
import type { StoryPhoto, StorySlide, StorySlideType } from "./types";

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
