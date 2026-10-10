import type { ImportData } from "@/features/datagate";
import type { LogItem } from "@/features/logs";
import type { LogLocation } from "@/types";

const PLACES = {
  prenzlauerBerg: {
    latitude: 52.5389,
    longitude: 13.4244,
    name: "Prenzlauer Berg, Berlin",
  },
  mitte: { latitude: 52.5206, longitude: 13.4094, name: "Mitte, Berlin" },
  kreuzberg: {
    latitude: 52.4986,
    longitude: 13.4033,
    name: "Kreuzberg, Berlin",
  },
  friedrichshain: {
    latitude: 52.5158,
    longitude: 13.4544,
    name: "Friedrichshain, Berlin",
  },
  tempelhof: {
    latitude: 52.4731,
    longitude: 13.4039,
    name: "Tempelhofer Feld, Berlin",
  },
  altona: { latitude: 53.5503, longitude: 9.9356, name: "Altona, Hamburg" },
  hafenCity: {
    latitude: 53.5413,
    longitude: 9.9984,
    name: "HafenCity, Hamburg",
  },
  stPauli: { latitude: 53.5547, longitude: 9.9658, name: "St. Pauli, Hamburg" },
  /** Reverse geocoding failed, so the card shows coordinates. */
  unnamed: { latitude: 52.3906, longitude: 13.0645, name: null },
} satisfies Record<string, LogLocation>;

const TIMELINE_TAGS = [
  ["Work", "blue"],
  ["Sport", "green"],
  ["Family", "orange"],
  ["Friends", "pink"],
  ["Sleep in", "violet"],
  ["Deep work", "blue"],
  ["Coffee with friends", "orange"],
  ["Long walk", "green"],
  ["Therapy", "violet"],
].map(([title, color], index) => ({
  id: `f1a2b3c4-0000-4c00-9000-${String(index).padStart(12, "0")}`,
  title,
  color,
}));

const LONG_NOTE = [
  "Slow start today. Coffee on the balcony, no phone for the first hour.",
  "",
  "The meeting at 11 went better than expected. We agreed to ship the smaller version first and see how people use it.",
  "",
  "Afternoon dip around 3. A walk around the block helped more than another coffee.",
  "Dinner with Sam, talked about the trip in spring.",
].join("\n");

interface TimelineEntry {
  day: number;
  time: string;
  rating: LogItem["rating"];
  message?: string;
  emotions?: LogItem["emotions"];
  tags?: string[];
  people?: number[];
  photos?: number[];
  location?: LogLocation;
}

/** Newest day first; `day` counts back from the newest day. */
const ENTRIES: TimelineEntry[] = [
  {
    day: 0,
    time: "08:10",
    rating: "good",
    message: "Morning run before work.",
    emotions: ["energized", "proud", "calm"],
    tags: ["Sport", "Long walk"],
    photos: [1],
    location: PLACES.prenzlauerBerg,
  },
  {
    day: 0,
    time: "13:05",
    rating: "neutral",
    message: LONG_NOTE,
    emotions: ["tired", "focused"],
    tags: ["Work", "Deep work"],
    location: PLACES.mitte,
  },
  {
    day: 0,
    time: "19:40",
    rating: "very_good",
    message: "Dinner by the canal.",
    emotions: ["happy", "grateful", "loved", "relaxed", "content"],
    tags: ["Friends", "Coffee with friends"],
    people: [0, 1],
    photos: [2, 4, 5],
    location: PLACES.kreuzberg,
  },
  {
    day: 1,
    time: "09:00",
    rating: "good",
    photos: [3],
    emotions: ["hopeful"],
  },
  {
    day: 1,
    time: "21:30",
    rating: "bad",
    message: "Too much at once. Glad the day is over.",
    emotions: [
      "anxious",
      "overwhelmed",
      "stressed",
      "frustrated",
      "tired",
      "annoyed",
      "lonely",
      "sad",
      "confused",
      "insecure",
      "nervous",
      "restless",
      "disappointed",
      "exhausted",
    ],
    tags: [
      "Work",
      "Deep work",
      "Family",
      "Friends",
      "Coffee with friends",
      "Therapy",
      "Sleep in",
    ],
    people: [0, 1, 2],
    location: PLACES.friedrichshain,
  },
  { day: 2, time: "22:15", rating: "neutral" },
  {
    day: 3,
    time: "07:30",
    rating: "good",
    message: "Early train to Hamburg.",
    emotions: ["excited", "curious"],
    photos: [6],
    location: PLACES.altona,
  },
  {
    day: 3,
    time: "12:00",
    rating: "very_good",
    message: "Lunch with a view.",
    emotions: ["amazed", "happy"],
    tags: ["Work"],
    people: [1],
    location: PLACES.hafenCity,
  },
  {
    day: 3,
    time: "18:20",
    rating: "good",
    emotions: ["cheerful", "alive"],
    tags: ["Friends"],
    people: [0],
    photos: [1, 2],
    location: PLACES.stPauli,
  },
  {
    day: 4,
    time: "20:00",
    rating: "neutral",
    message: LONG_NOTE,
    emotions: ["calm", "content"],
    tags: ["Family"],
  },
  {
    day: 5,
    time: "11:45",
    rating: "good",
    message: "Picnic, no idea what the place is called.",
    emotions: ["relaxed"],
    tags: ["Long walk"],
    location: PLACES.unnamed,
  },
  {
    day: 6,
    time: "17:10",
    rating: "very_good",
    message: "Sunset on the field.",
    emotions: ["grateful", "inspired"],
    tags: ["Sport", "Friends"],
    people: [2],
    photos: [1, 3, 5],
    location: PLACES.tempelhof,
  },
  {
    day: 6,
    time: "21:00",
    rating: "good",
    photos: [4, 6],
    tags: ["Therapy"],
  },
];

// Newest fixture day; `endsToday` shifts it to today.
const NEWEST_DAY = "2026-09-30";

const pad = (index: number) => String(index).padStart(12, "0");

/**
 * One week of entries for the timeline: several entries a day, places,
 * photos, both together, long notes, and entries with many chips. Keeps the
 * people and tags of `data` and adds missing tags, some with long names.
 *
 * Photos reference bundled files by name (`fixture-photo-<n>.jpg`, see
 * `photoAssets.ts`); the loader imports them.
 */
export const withTimeline = (data: ImportData): ImportData => {
  const known = new Set((data.tags ?? []).map((tag) => tag.title));
  const tags = [
    ...(data.tags ?? []),
    ...TIMELINE_TAGS.filter((tag) => !known.has(tag.title)),
  ];
  const tagIds = new Map(tags.map((tag) => [tag.title, tag.id]));
  const people = data.people ?? [];
  const newest = new Date(`${NEWEST_DAY}T00:00:00.000Z`);

  const items = ENTRIES.map((entry, index) => {
    const day = new Date(newest);
    day.setUTCDate(day.getUTCDate() - entry.day);
    const date = day.toISOString().slice(0, 10);
    const dateTime = `${date}T${entry.time}:00.000Z`;
    return {
      id: `7e1a0000-0000-4000-8000-${pad(index)}`,
      date,
      dateTime,
      createdAt: dateTime,
      rating: entry.rating,
      sleep: { quality: "neutral" as const },
      message: entry.message ?? "",
      emotions: entry.emotions ?? [],
      tags: (entry.tags ?? []).flatMap((title) => {
        const id = tagIds.get(title);
        return id === undefined ? [] : [{ id }];
      }),
      people: (entry.people ?? []).flatMap((personIndex) => {
        const person = people[personIndex];
        return person === undefined ? [] : [{ id: person.id }];
      }),
      photos: (entry.photos ?? []).map((photo, photoIndex) => ({
        id: `7e1a0000-0000-4000-9000-${pad(index * 10 + photoIndex)}`,
        fileName: `fixture-photo-${photo}.jpg`,
        width: photo === 3 ? 900 : 1200,
        height: photo === 3 ? 1200 : 900,
        createdAt: dateTime,
        source: "day" as const,
      })),
      ...(entry.location !== undefined && { location: entry.location }),
    };
  });

  return { ...data, tags, items };
};
