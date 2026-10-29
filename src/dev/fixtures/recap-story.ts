import dayjs from "dayjs";
import type { ExportPerson, ImportData } from "@/features/datagate";
import type { LogItem } from "@/features/logs";
import type { Tag } from "@/features/tags";

const PEOPLE: ExportPerson[] = [
  { id: "5a0e1c2d-0001-4b3e-9f6e-1a0000000001", name: "Ada" },
  { id: "5a0e1c2d-0002-4b3e-9f6e-1a0000000002", name: "Chuky" },
  { id: "5a0e1c2d-0003-4b3e-9f6e-1a0000000003", name: "Jen" },
  { id: "5a0e1c2d-0005-4b3e-9f6e-1a0000000005", name: "Oma Hilde" },
  { id: "5a0e1c2d-0006-4b3e-9f6e-1a0000000006", name: "Tobi" },
].map((person) => ({
  ...person,
  avatar: null,
  createdAt: "2026-01-01T09:00:00.000Z",
}));
const [ADA, CHUKY, JEN, HILDE, TOBI] = PEOPLE.map((person) => person.id);

const tag = (id: number, title: string, color: string): Tag => ({
  id: `5a0e1c2d-0${id}00-4b3e-9f6e-2b0000000000`,
  title,
  color,
});
const TAGS = {
  walk: tag(1, "Walk", "lime"),
  swimming: tag(2, "Swimming", "sky"),
  reading: tag(3, "Reading", "violet"),
  playground: tag(4, "Playground", "amber"),
  work: tag(5, "Work", "slate"),
  handover: tag(6, "Handover", "pink"),
};

const HOME = { latitude: 53.57, longitude: 9.95, name: "Eimsbüttel, Hamburg" };
const POOL = { latitude: 53.57, longitude: 9.96, name: "Kaifu-Bad, Hamburg" };
const SEA = { latitude: 53.96, longitude: 10.87, name: "Strand, Travemünde" };

const entry = (
  date: dayjs.Dayjs,
  index: number,
  fields: Partial<LogItem>
): LogItem => {
  const iso = date.hour(19).toISOString();
  return {
    id: `5a0e1c2d-${date.format("YYYYMMDD").slice(0, 4)}-4b3e-9f6e-${date.format("MMDD")}${String(index).padStart(8, "0")}`,
    date: date.format("YYYY-MM-DD"),
    dateTime: iso,
    createdAt: iso,
    rating: "good",
    message: "",
    sleep: { quality: "good" },
    tags: [],
    people: [],
    emotions: [],
    photos: [],
    location: HOME,
    ...fields,
  };
};

const photo = (date: dayjs.Dayjs, n: number) => ({
  id: `5a0e1c2d-0000-4b3e-9f6e-3c${date.format("MMDD")}000000`,
  fileName: `fixture-photo-${(n % 6) + 1}.jpg`,
  width: 1200,
  height: 900,
  createdAt: date.hour(18).toISOString(),
  source: "day" as const,
});

const isHardDay = (day: number) => day === 6 || day === 20 || day === 21;
const isSeaDay = (day: number) => day >= 11 && day <= 13;

const tagsOf = (date: dayjs.Dayjs, day: number) => [
  ...(day % 6 === 0 && !isHardDay(day) ? [] : [TAGS.walk]),
  ...(date.day() === 6 ? [TAGS.swimming] : []),
  ...(day % 4 === 1 ? [TAGS.reading] : []),
  ...(day % 5 === 2 ? [TAGS.playground] : []),
  ...(date.day() >= 1 && date.day() <= 4 ? [TAGS.work] : []),
  ...(day === 6 || day === 20 || day === 27 ? [TAGS.handover] : []),
];

const ratingOf = (date: dayjs.Dayjs, day: number): LogItem["rating"] => {
  if (date.day() === 6 || isSeaDay(day)) {
    return "extremely_good";
  }
  if (isHardDay(day)) {
    return "bad";
  }
  return day % 3 === 0 ? "very_good" : "good";
};

const placeOf = (date: dayjs.Dayjs, day: number) => {
  if (isSeaDay(day)) {
    return SEA;
  }
  return date.day() === 6 ? POOL : HOME;
};

/**
 * The story month, like Klara's September: every Saturday swimming, a walk
 * most days, 2 of 3 harder days with Handover, 3 days at the sea (first
 * time there), 10 photo days, Ada and Chuky on most days, Tobi on the
 * Handover days, Oma Hilde every 9 days.
 */
const storyMonth = (start: dayjs.Dayjs): LogItem[] =>
  Array.from({ length: start.daysInMonth() }, (_, index) => {
    const date = start.add(index, "day");
    const day = index + 1;
    const hasPhoto =
      !isHardDay(day) && (date.day() === 6 || isSeaDay(day) || day % 7 === 3);
    return entry(date, day, {
      rating: ratingOf(date, day),
      tags: tagsOf(date, day).map(({ id }) => ({ id })),
      people: [
        { id: CHUKY },
        ...(day % 4 === 0 ? [] : [{ id: ADA }]),
        ...(day === 8 || day === 15 ? [{ id: JEN }] : []),
        ...(day % 9 === 4 ? [{ id: HILDE }] : []),
        ...(day === 6 || day === 20 || day === 27 ? [{ id: TOBI }] : []),
      ],
      photos: hasPhoto ? [photo(date, day)] : [],
      location: placeOf(date, day),
    });
  });

/** A quieter month: some walks, one Saturday swim, check-ins at home. */
const earlierMonth = (start: dayjs.Dayjs, count: number): LogItem[] =>
  Array.from({ length: count }, (_, index) => {
    const date = start.add(index * 2, "day");
    return entry(date, index, {
      rating: index % 3 === 0 ? "neutral" : "good",
      tags: [
        { id: TAGS.walk.id },
        ...(index % 2 === 0 ? [{ id: TAGS.work.id }] : []),
        ...(index % 4 === 0 ? [{ id: TAGS.reading.id }] : []),
      ],
      people: [{ id: CHUKY }],
    });
  });

/**
 * Month story data for the month before `today`: the story month, 12
 * check-ins the month before (for "vs last month"), 8 two months before
 * (location history for the first city), and the current month so far.
 * Dates follow `today`, so weekdays and month ends stay real.
 */
export const withRecapStory = (
  data: ImportData,
  today = dayjs()
): ImportData => {
  const story = today.subtract(1, "month").startOf("month");
  const now = today.startOf("month");
  const items = [
    ...earlierMonth(story.subtract(2, "month"), 8),
    ...earlierMonth(story.subtract(1, "month"), 12),
    ...storyMonth(story),
    ...Array.from({ length: today.date() - 1 }, (_, index) =>
      entry(now.add(index, "day"), index, {
        tags: [{ id: TAGS.walk.id }],
        people: [{ id: CHUKY }],
      })
    ),
  ];
  return {
    ...data,
    items,
    tags: Object.values(TAGS),
    people: PEOPLE,
    settings: {
      ...data.settings,
      reminderEnabled: true,
      steps: [
        "rating",
        "emotions",
        "tags",
        "people",
        "sleep",
        "photos",
        "message",
      ],
    },
  };
};

const weekRating = (index: number): LogItem["rating"] => {
  if (index === 3) {
    return "neutral";
  }
  return index % 2 === 1 ? "very_good" : "extremely_good";
};

const MAX: ExportPerson = {
  id: "5a0e1c2d-0004-4b3e-9f6e-1a0000000004",
  name: "Max",
  avatar: null,
  createdAt: "2026-01-01T09:00:00.000Z",
};

/**
 * Week story data: the 7 days before `today` as a full week story (5 photo
 * days, Ada on 6 days, Chuky 4, Jen 3, Max 2, Walk, Work, and Reading on
 * 4+ days), plus 3 quieter weeks before it. Open with
 * `recaps/story/<first day>?kind=week`.
 */
export const withRecapWeekStory = (
  data: ImportData,
  today = dayjs()
): ImportData => {
  const start = today.subtract(7, "day").startOf("day");
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = start.add(index, "day");
    return entry(date, index, {
      rating: weekRating(index),
      tags: [
        ...(index === 3 ? [] : [{ id: TAGS.walk.id }]),
        ...(index < 5 ? [{ id: TAGS.work.id }] : []),
        ...(index % 2 === 0 ? [{ id: TAGS.reading.id }] : []),
      ],
      people: [
        ...(index === 3 ? [] : [{ id: ADA }]),
        ...(index % 2 === 1 || index === 6 ? [{ id: CHUKY }] : []),
        ...(index === 0 || index === 4 || index === 6 ? [{ id: JEN }] : []),
        ...(index === 2 || index === 5 ? [{ id: MAX.id }] : []),
      ],
      photos: index === 3 || index === 1 ? [] : [photo(date, index)],
    });
  });
  const earlier = earlierMonth(start.subtract(21, "day"), 10);
  return {
    ...data,
    items: [...earlier, ...week],
    tags: Object.values(TAGS),
    people: [...PEOPLE, MAX],
    settings: {
      ...data.settings,
      reminderEnabled: true,
      steps: [
        "rating",
        "emotions",
        "tags",
        "people",
        "sleep",
        "photos",
        "message",
      ],
    },
  };
};
