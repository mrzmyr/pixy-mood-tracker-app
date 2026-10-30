import type { ConfigurableLoggerStep } from "@/constants/logger-steps";
import type { ExportPerson, ImportData } from "@/features/datagate";
import type { LogItem } from "@/features/logs";
import type { Tag } from "@/features/tags";
import type { LogLocation } from "@/types";

/**
 * Personas from docs/personas.md as test data. Each persona logs in one
 * style, like real users do. Same data on every load.
 */
export type PersonaId =
  | "lea"
  | "jonas"
  | "sara"
  | "ben"
  | "mia"
  | "paul"
  | "nina";

// Newest fixture day; `endsToday` shifts it to today.
const NEWEST_DAY = "2026-09-30";
const DAYS = 28;

// Mostly good days with a few hard ones, repeated over the weeks.
const RATINGS: LogItem["rating"][] = [
  "good",
  "very_good",
  "good",
  "neutral",
  "good",
  "bad",
  "very_good",
  "good",
  "extremely_good",
  "good",
  "neutral",
  "very_bad",
  "good",
  "very_good",
];

const isHard = (rating: LogItem["rating"]) =>
  rating === "bad" || rating === "very_bad" || rating === "extremely_bad";

const GOOD_EMOTIONS = [
  "grateful",
  "calm",
  "happy",
  "content",
  "energized",
  "hopeful",
  "loved",
  "proud",
  "relieved",
  "focused",
  "inspired",
  "connected",
  "satisfied",
  "balanced",
];
const HARD_EMOTIONS = [
  "anxious",
  "tired",
  "stressed",
  "overwhelmed",
  "frustrated",
  "lonely",
  "sad",
  "exhausted",
  "worried",
  "nervous",
  "disappointed",
  "insecure",
];

const tag = (index: number, title: string, color: string): Tag => ({
  id: `9e550000-0000-4000-8000-${String(index).padStart(12, "0")}`,
  title,
  color,
});
const TAGS: Tag[] = [
  tag(1, "Work", "slate"),
  tag(2, "Walk", "lime"),
  tag(3, "Family", "sky"),
  tag(4, "Friends", "pink"),
  tag(5, "Gym", "rose"),
  tag(6, "Cooking", "amber"),
  tag(7, "Reading", "violet"),
  tag(8, "Coffee", "orange"),
  tag(9, "Therapy", "indigo"),
  tag(10, "Meditation", "teal"),
  tag(11, "Late night", "purple"),
  tag(12, "Rain", "cyan"),
];

const PEOPLE: ExportPerson[] = ["Lena", "Sam", "Max", "Oma Hilde", "Tobi"].map(
  (name, index) => ({
    id: `9e550000-0000-4000-9000-${String(index).padStart(12, "0")}`,
    name,
    avatar: null,
    createdAt: "2026-01-01T09:00:00.000Z",
  })
);

const HOME: LogLocation = {
  latitude: 53.57,
  longitude: 9.95,
  name: "Eimsbüttel, Hamburg",
};

const NOTES = [
  "Long walk by the river after work. Cooked pasta, early night.",
  "Slow morning. Coffee on the balcony before anything else.",
  "Deadline stress. Called Max on the way home.",
  "Good talk with Lena about the move. Still not sure, but lighter.",
  [
    "Started the day tired, but the meeting went better than I expected.",
    "We agreed to ship the smaller version first.",
    "",
    "Afternoon dip around 3. A walk around the block helped more than another coffee.",
    "Dinner with Sam, talked about the trip in spring. I want to write more of these evenings down.",
  ].join("\n"),
  "Rain all day. Read on the sofa.",
];

/** Long note for heavy writers: every note 3 times, about 1,700 characters. */
const LONG_NOTE = [...NOTES, ...NOTES, ...NOTES].join("\n\n");

// `count` items of `list`, starting at `offset`, wrapping around.
const take = <T>(list: readonly T[], offset: number, count: number): T[] =>
  Array.from(
    { length: count },
    (_, index) => list[(offset + index) % list.length]
  );

const emotionsFor = (rating: LogItem["rating"], day: number, count: number) =>
  take(isHard(rating) ? HARD_EMOTIONS : GOOD_EMOTIONS, day * 3, count);

const photo = (dateTime: string, id: string, n: number) => ({
  id,
  fileName: `fixture-photo-${n}.jpg`,
  width: n === 3 ? 900 : 1200,
  height: n === 3 ? 1200 : 900,
  createdAt: dateTime,
  source: "day" as const,
});

type Content = Partial<
  Pick<
    LogItem,
    "message" | "emotions" | "tags" | "people" | "photos" | "location"
  >
> & { photoCount?: number };

interface PersonaPlan {
  /** Logger steps this persona keeps on. */
  steps: ConfigurableLoggerStep[];
  /** Days with entries, counted back from the newest day. */
  days: number[];
  /** Entry times per day, `HH:mm` UTC. */
  times: (day: number) => string[];
  content: (rating: LogItem["rating"], day: number, slot: number) => Content;
  hasPeople?: boolean;
}

const ALL_DAYS = Array.from({ length: DAYS }, (_, day) => day);

const PLANS: Record<PersonaId, PersonaPlan> = {
  // Quick Tapper: mood only, often twice a day.
  lea: {
    steps: ["rating"],
    days: ALL_DAYS,
    times: (day) => (day % 3 === 2 ? ["19:30"] : ["08:15", "19:30"]),
    content: () => ({}),
  },
  // Journaler: notes, short to long, no emotions or tags.
  jonas: {
    steps: ["rating", "message"],
    days: ALL_DAYS.filter((day) => day % 5 !== 4),
    times: () => ["21:40"],
    content: (_rating, day) => ({
      message: day % 7 === 6 ? LONG_NOTE : NOTES[day % NOTES.length],
    }),
  },
  // Emotion Labeler: 3 to 6 emotions, nothing else.
  sara: {
    steps: ["rating", "emotions"],
    days: ALL_DAYS,
    times: () => ["20:10"],
    content: (rating, day) => ({
      emotions: emotionsFor(rating, day, 3 + (day % 4)),
    }),
  },
  // Tag Tracker: 3 to 6 tags from a stable set, every day.
  ben: {
    steps: ["rating", "tags"],
    days: ALL_DAYS,
    times: () => ["22:00"],
    content: (_rating, day) => ({
      tags: take(TAGS.slice(0, 8), day * 2, 3 + (day % 4)).map(({ id }) => ({
        id,
      })),
    }),
  },
  // Tryout: 3 entries in the first days, default steps, first one hard.
  mia: {
    steps: ["rating", "emotions", "tags", "sleep", "message"],
    days: [0, 1, 3],
    times: () => ["18:45"],
    content: (_rating, day) =>
      day === 0 ? { emotions: ["tired"], message: "Trying this out." } : {},
  },
  // Multi-Logger: a bit of everything, people and photos on some days.
  paul: {
    steps: [
      "rating",
      "sleep",
      "emotions",
      "tags",
      "people",
      "photos",
      "message",
    ],
    days: ALL_DAYS,
    times: (day) => (day % 4 === 0 ? ["12:30", "20:30"] : ["20:30"]),
    hasPeople: true,
    content: (rating, day, slot) => ({
      emotions: emotionsFor(rating, day, 2 + (day % 3)),
      tags: take(TAGS, day, 2 + (day % 2)).map(({ id }) => ({ id })),
      message: slot === 0 ? NOTES[day % 4] : "",
      people:
        day % 2 === 0 ? take(PEOPLE, day, 1 + (day % 3 === 0 ? 1 : 0)) : [],
      photoCount: day % 3 === 0 ? 1 + (day % 2) * 2 : 0,
      location: HOME,
    }),
  },
  // Max Load: realistic upper bound, everything filled heavily.
  nina: {
    steps: [
      "rating",
      "sleep",
      "emotions",
      "tags",
      "people",
      "photos",
      "message",
    ],
    days: ALL_DAYS,
    times: () => ["21:15"],
    hasPeople: true,
    content: (rating, day) => ({
      emotions: emotionsFor(rating, day, 8 + (day % 7)),
      tags: take(TAGS, day, 8 + (day % 5)).map(({ id }) => ({ id })),
      message: LONG_NOTE,
      people: take(PEOPLE, day, 3 + (day % 3)),
      photoCount: 4 + (day % 3),
      location: HOME,
    }),
  },
};

const pad = (value: number) => String(value).padStart(12, "0");

/** Builds the persona's entries, tags, people, and steps on top of `data`. */
export const withPersona = (persona: PersonaId) => {
  const plan = PLANS[persona];
  return (data: ImportData): ImportData => {
    const newest = new Date(`${NEWEST_DAY}T00:00:00.000Z`);
    let index = 0;
    const items: LogItem[] = plan.days.flatMap((day) => {
      const date = new Date(newest);
      date.setUTCDate(date.getUTCDate() - day);
      const dayString = date.toISOString().slice(0, 10);
      const rating =
        persona === "mia" && day === 0 ? "bad" : RATINGS[day % RATINGS.length];
      return plan.times(day).map((time, slot) => {
        const dateTime = `${dayString}T${time}:00.000Z`;
        const {
          photoCount = 0,
          people = [],
          ...content
        } = plan.content(rating, day, slot);
        index += 1;
        const entryIndex = index;
        return {
          id: `9e550000-0000-4000-a000-${pad(entryIndex)}`,
          date: dayString,
          dateTime,
          createdAt: dateTime,
          rating: slot === 0 ? rating : RATINGS[(day + 3) % RATINGS.length],
          sleep: { quality: isHard(rating) ? "bad" : "good" },
          message: "",
          emotions: [],
          tags: [],
          photos: Array.from({ length: photoCount }, (_, photoIndex) =>
            photo(
              dateTime,
              `9e550000-0000-4000-b000-${pad(entryIndex * 10 + photoIndex)}`,
              ((day + photoIndex) % 6) + 1
            )
          ),
          ...content,
          people: people.map(({ id }) => ({ id })),
        };
      });
    });
    return {
      ...data,
      items,
      tags: plan.steps.includes("tags") ? TAGS : [],
      people: plan.hasPeople ? PEOPLE : [],
      settings: { ...data.settings, steps: plan.steps },
    };
  };
};
