import { getWeekLocale } from "@/lib/translation";
import type { EntryPreviewData } from "../components/entry-preview";

// Story data: demo character Klara (docs/demo-characters). Photos come
// from Storybook `staticDirs`.
const photo = (file: string) => `/demo/${file}`;

/** Fixed "today" of every story: Saturday, swim day. */
export const STORY_TODAY = "2026-11-07";

const ada = {
  id: "ada",
  name: "Ada",
  avatarUri: photo("ada.jpg"),
  initials: "A",
};
const chuky = {
  id: "chuky",
  name: "Chuky",
  avatarUri: photo("klara-chuky.jpg"),
  initials: "C",
};
const jen = {
  id: "jen",
  name: "Jen",
  avatarUri: photo("klara-jen.jpg"),
  initials: "J",
};
const hilde = {
  id: "hilde",
  name: "Oma Hilde",
  avatarUri: null,
  initials: "OH",
};
const tobi = { id: "tobi", name: "Tobi", avatarUri: null, initials: "T" };

const base = {
  emotions: [],
  note: "",
  people: [],
  tags: [],
  place: null,
  photoUris: [],
} satisfies Partial<EntryPreviewData>;

/** Klara's entries of 2 to 7 November, keyed by date. */
export const KLARA_ENTRIES = {
  "2026-11-07": [
    {
      ...base,
      id: "a",
      date: "2026-11-07",
      time: "07:40",
      rating: "good",
      emotions: ["Rested", "Calm"],
      note: "Ada climbed into bed at 6. Coffee before anyone else was up.",
      people: [ada],
      tags: [{ id: "morning", title: "Morning" }],
    },
    {
      ...base,
      id: "b",
      date: "2026-11-07",
      time: "11:40",
      rating: "very_good",
      emotions: ["Happy", "Proud"],
      note: "Swim day at Kaifu-Bad. Ada jumped from the 3 m board for the first time and would not stop talking about it.",
      people: [ada],
      tags: [{ id: "sport", title: "Sport" }],
      place: "Kaifu-Bad",
      photoUris: [
        photo("klara-ada-kaifu-bad.jpg"),
        photo("klara-ada-swimming.jpg"),
        photo("klara-underwater.jpg"),
      ],
    },
    {
      ...base,
      id: "c",
      date: "2026-11-07",
      time: "15:10",
      rating: "good",
      emotions: ["Loved", "Tired"],
      note: "Long loop through Eimsbüttel with Chuky. He ate a leaf. Again.",
      people: [chuky, ada],
      tags: [{ id: "walk", title: "Walk" }],
      photoUris: [photo("klara-chuky.jpg")],
    },
  ],
  "2026-11-06": [
    {
      ...base,
      id: "d",
      date: "2026-11-06",
      time: "12:30",
      rating: "good",
      emotions: ["Focused"],
      note: "Short lunch in the sun between patients.",
      tags: [{ id: "work", title: "Work" }],
    },
    {
      ...base,
      id: "e",
      date: "2026-11-06",
      time: "23:15",
      rating: "very_good",
      emotions: ["Silly", "Energized"],
      note: "Jen’s birthday. Danced way too long, voice is gone.",
      people: [jen],
      tags: [{ id: "friends", title: "Friends" }],
      photoUris: [photo("klara-jen.jpg")],
    },
  ],
  "2026-11-05": [
    {
      ...base,
      id: "f",
      date: "2026-11-05",
      time: "21:10",
      rating: "very_good",
      emotions: ["Loved", "Relieved"],
      note: "Two-hour call with Jen. Feels lighter.",
      people: [jen],
    },
  ],
  "2026-11-04": [
    {
      ...base,
      id: "g",
      date: "2026-11-04",
      time: "17:05",
      rating: "neutral",
      emotions: ["Moved", "Grateful", "Sad"],
      note: "Letter from Oma Hilde. Her handwriting is shakier.",
      people: [hilde],
      tags: [{ id: "family", title: "Family" }],
      photoUris: [photo("klara-letter.jpg")],
    },
  ],
  "2026-11-02": [
    {
      ...base,
      id: "h",
      date: "2026-11-02",
      time: "18:40",
      rating: "bad",
      emotions: ["Drained", "Irritated"],
      note: "Handover at the station took forever. Ada cried in the car.",
      people: [tobi, ada],
      tags: [{ id: "handover", title: "Handover" }],
    },
  ],
} satisfies Record<string, EntryPreviewData[]>;

/** Average rating per day of Klara's last weeks, with one missed day. */
export const KLARA_RATINGS = {
  "2026-10-26": "good",
  "2026-10-27": "very_good",
  "2026-10-28": "neutral",
  "2026-10-29": "good",
  "2026-10-30": "very_bad",
  "2026-10-31": "good",
  "2026-11-01": "extremely_good",
  "2026-11-02": "bad",
  "2026-11-04": "neutral",
  "2026-11-05": "very_good",
  "2026-11-06": "good",
  "2026-11-07": "good",
} satisfies Record<string, EntryPreviewData["rating"]>;

/** One entry per persona (docs/personas.md), for preview edge cases. */
export const PERSONA_ENTRIES = {
  "A Lea, mood only": {
    ...base,
    id: "lea",
    date: STORY_TODAY,
    time: "08:02",
    rating: "neutral",
  },
  "B Jonas, long note": {
    ...base,
    id: "jonas",
    date: STORY_TODAY,
    time: "22:41",
    rating: "bad",
    note: "Couldn’t sleep again. Kept replaying the meeting with Mark and what I should have said. ".repeat(
      12
    ),
  },
  "C Sara, many emotions": {
    ...base,
    id: "sara",
    date: STORY_TODAY,
    time: "19:15",
    rating: "very_good",
    emotions: [
      "Grateful",
      "Hopeful",
      "Content",
      "Inspired",
      "Relieved",
      "Proud",
    ],
  },
  "D Ben, tags": {
    ...base,
    id: "ben",
    date: STORY_TODAY,
    time: "18:00",
    rating: "good",
    tags: ["Gym", "Work", "Coffee", "Reading", "Cooking", "Early Night"].map(
      (title) => ({ id: title, title })
    ),
  },
  "F Paul, every module": { ...KLARA_ENTRIES["2026-11-07"][1], id: "paul" },
  "G Nina, max load": {
    ...base,
    id: "nina",
    date: STORY_TODAY,
    time: "23:58",
    rating: "extremely_bad",
    emotions: [
      "Overwhelmed",
      "Anxious",
      "Lonely",
      "Exhausted",
      "Frustrated",
      "Ashamed",
      "Sad",
      "Restless",
      "Numb",
      "Hopeless",
    ],
    note: "Everything at once today. ".repeat(60),
    people: [ada, chuky, jen, hilde, tobi],
    tags: [
      "Work",
      "Family",
      "Commute",
      "Doctor",
      "Rain",
      "Deadline",
      "Kids",
      "Money",
    ].map((title) => ({ id: title, title })),
    place: "Universitätsklinikum Hamburg-Eppendorf, Martinistraße",
    photoUris: [photo("klara-underwater.jpg")],
  },
} satisfies Record<string, EntryPreviewData>;

/** Week locale of every story: weeks start on Monday. */
export const STORY_WEEK_LOCALE = getWeekLocale({ weekStart: 1 });
