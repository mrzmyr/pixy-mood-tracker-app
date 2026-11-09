import dayjs from "dayjs";
import type { ExportPerson, ImportData } from "@/features/datagate";
import type { LogItem } from "@/features/logs";
import type { Tag } from "@/features/tags";

// Klara's last 6 days for Home (flag `home-week`): same entries as the HTML
// prototype, with her real photos from `photo-assets.ts`. Today is the
// 6th day; earlier weeks get one entry a day so the week strip has colors.

const uuid = (kind: number, index: number) =>
  `6b1f2e3a-000${kind}-4c3e-8f6e-${String(index).padStart(12, "0")}`;

const PEOPLE: ExportPerson[] = ["Ada", "Chuky", "Jen", "Oma Hilde", "Tobi"].map(
  (name, index) => ({
    id: uuid(1, index),
    name,
    avatar: null,
    createdAt: "2026-01-01T09:00:00.000Z",
  })
);
const person = (name: string) => ({
  id: PEOPLE.find((candidate) => candidate.name === name)?.id ?? "",
});

const TAG_LIST: Tag[] = [
  ["Morning", "amber"],
  ["Sport", "sky"],
  ["Walk", "lime"],
  ["Work", "slate"],
  ["Friends", "violet"],
  ["Night out", "pink"],
  ["Family", "rose"],
  ["Handover", "orange"],
].map(([title, color], index) => ({
  id: uuid(2, index),
  title: title ?? "",
  color: color ?? "slate",
}));
const tag = (title: string) => ({
  id: TAG_LIST.find((candidate) => candidate.title === title)?.id ?? "",
});

const HOME = { latitude: 53.57, longitude: 9.95, name: "Eimsbüttel, Hamburg" };
const POOL = { latitude: 53.57, longitude: 9.96, name: "Kaifu-Bad" };

interface DayEntry {
  time: string;
  rating: LogItem["rating"];
  emotions: string[];
  message?: string;
  people?: string[];
  tags?: string[];
  photos?: string[];
  pool?: boolean;
}

/** Days before today: 5 is Monday of the prototype week, 0 is today. */
const WEEK: {
  daysAgo: number;
  sleep: LogItem["sleep"]["quality"];
  entries: DayEntry[];
}[] = [
  {
    daysAgo: 5,
    sleep: "bad",
    entries: [
      { time: "08:10", rating: "neutral", emotions: ["tired"], tags: ["Work"] },
      {
        time: "18:40",
        rating: "bad",
        emotions: ["exhausted", "irritated"],
        message: "Handover at the station took forever. Ada cried in the car.",
        people: ["Tobi", "Ada"],
        tags: ["Handover"],
      },
    ],
  },
  {
    daysAgo: 4,
    sleep: "good",
    entries: [
      {
        time: "19:30",
        rating: "good",
        emotions: ["focused", "content"],
        message: "Full day at the practice, back felt fine after.",
        tags: ["Work"],
      },
    ],
  },
  {
    daysAgo: 3,
    sleep: "neutral",
    entries: [
      {
        time: "17:05",
        rating: "neutral",
        emotions: ["moved", "grateful", "sad"],
        message:
          "Letter from Oma Hilde. Her handwriting is shakier. She asked when Ada visits.",
        people: ["Oma Hilde"],
        tags: ["Family"],
        photos: ["letter"],
      },
    ],
  },
  {
    daysAgo: 2,
    sleep: "very_good",
    entries: [
      {
        time: "07:20",
        rating: "good",
        emotions: ["calm"],
        message: "Early walk with Chuky before work.",
        people: ["Chuky"],
        tags: ["Walk"],
        photos: ["chuky-park"],
      },
      {
        time: "21:10",
        rating: "very_good",
        emotions: ["loved", "relieved"],
        message: "Two-hour call with Jen. Feels lighter.",
        people: ["Jen"],
        tags: ["Friends"],
        photos: ["jen-call"],
      },
    ],
  },
  {
    daysAgo: 1,
    sleep: "neutral",
    entries: [
      {
        time: "12:30",
        rating: "good",
        emotions: ["focused"],
        message: "Short lunch in the sun between patients.",
        tags: ["Work"],
      },
      {
        time: "23:15",
        rating: "very_good",
        emotions: ["playful", "energized"],
        message: "Jen’s birthday. Danced way too long, voice is gone.",
        people: ["Jen"],
        tags: ["Friends", "Night out"],
      },
    ],
  },
  {
    daysAgo: 0,
    sleep: "good",
    entries: [
      {
        time: "07:40",
        rating: "good",
        emotions: ["relaxed", "calm"],
        message: "Ada climbed into bed at 6. Coffee before anyone else was up.",
        people: ["Ada"],
        tags: ["Morning"],
        photos: ["breakfast"],
      },
      {
        time: "11:40",
        rating: "very_good",
        emotions: ["happy", "proud"],
        message:
          "Swim day at Kaifu-Bad. Ada jumped from the 3 m board for the first time and would not stop talking about it.",
        people: ["Ada"],
        tags: ["Sport"],
        photos: ["kaifu-bad", "swimming", "underwater"],
        pool: true,
      },
      {
        time: "15:10",
        rating: "good",
        emotions: ["loved", "tired"],
        message:
          "Long loop through Eimsbüttel with Chuky. He ate a leaf. Again.",
        people: ["Chuky", "Ada"],
        tags: ["Walk"],
        photos: ["rain-walk"],
      },
    ],
  },
];

/** Ratings of the 3 weeks before, one entry a day, mostly good. */
const EARLIER: LogItem["rating"][] = [
  "good",
  "very_good",
  "neutral",
  "good",
  "very_bad",
  "good",
  "extremely_good",
  "very_good",
  "good",
  "good",
  "bad",
  "good",
  "very_good",
  "neutral",
  "good",
  "neutral",
  "very_good",
  "good",
  "good",
  "extremely_good",
  "good",
];

const item = (
  date: dayjs.Dayjs,
  index: number,
  sleep: LogItem["sleep"]["quality"],
  entry: DayEntry
): LogItem => {
  const [hour, minute] = entry.time.split(":").map(Number);
  const at = date
    .hour(hour ?? 12)
    .minute(minute ?? 0)
    .second(0);
  return {
    id: uuid(3, index),
    date: date.format("YYYY-MM-DD"),
    dateTime: at.toISOString(),
    createdAt: at.toISOString(),
    rating: entry.rating,
    message: entry.message ?? "",
    sleep: { quality: sleep },
    tags: (entry.tags ?? []).map(tag),
    people: (entry.people ?? []).map(person),
    // SAFETY: every key above is in the emotion catalog (assets/locales/en.json).
    emotions: entry.emotions as LogItem["emotions"],
    photos: (entry.photos ?? []).map((name, photoIndex) => ({
      id: uuid(4, index * 10 + photoIndex),
      fileName: `klara-${name}.jpg`,
      width: 640,
      height: 640,
      createdAt: at.toISOString(),
      source: "day" as const,
    })),
    location: entry.pool ? POOL : HOME,
  };
};

/** Klara's week for Home, ending today. */
export const withHomeWeek = (data: ImportData, today = dayjs()): ImportData => {
  const start = today.startOf("day");
  const earlier = EARLIER.map((rating, day) =>
    item(start.subtract(26 - day, "day"), day, "good", {
      time: "19:00",
      rating,
      emotions: [],
    })
  );
  const week = WEEK.flatMap(({ daysAgo, sleep, entries }, dayIndex) =>
    entries.map((entry, entryIndex) =>
      item(
        start.subtract(daysAgo, "day"),
        100 + dayIndex * 10 + entryIndex,
        sleep,
        entry
      )
    )
  );
  return {
    ...data,
    items: [...earlier, ...week],
    tags: TAG_LIST,
    people: PEOPLE,
  };
};
