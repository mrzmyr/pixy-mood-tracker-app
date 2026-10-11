import type { ExportPerson, ImportData } from "@/features/datagate";
import type { LogItem } from "@/features/logs";
import type { Tag } from "@/features/tags";

// Newest fixture day; `endsToday` shifts it to today.
const NEWEST_DAY = "2026-09-30";
const DAYS = 91;

const PEOPLE: ExportPerson[] = [
  {
    id: "recap-sam",
    name: "Sam",
    avatar: null,
    createdAt: "2026-01-01T09:00:00.000Z",
  },
  {
    id: "recap-rosa",
    name: "Rosa",
    avatar: null,
    createdAt: "2026-01-01T09:00:00.000Z",
  },
  {
    id: "recap-lena",
    name: "Lena",
    avatar: null,
    createdAt: "2026-01-01T09:00:00.000Z",
  },
];

const TAGS: Tag[] = [
  { id: "recap-work", title: "Work", color: "blue" },
  { id: "recap-sport", title: "Sport", color: "green" },
];

const BERLIN = { latitude: 52.52, longitude: 13.4, name: "Mitte, Berlin" };
const POTSDAM = {
  latitude: 52.39,
  longitude: 13.1,
  name: "Babelsberg, Potsdam",
};

/** Days before the newest day, per moment it triggers. */
const SAM = new Set([3, 45, 47, 50]);
const ROSA = new Set([2]);
// 24 connected days before the newest week, then day 4: crosses 25.
const LENA = new Set([
  4,
  ...Array.from({ length: 24 }, (_, index) => 8 + index * 3),
]);
const SPORT = new Set([2, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58]);
const STRESSED = new Set([30, 35, 40, 45, 50, 55]);
const PROUD = new Set([1, 70]);
const ROUGH_NIGHTS = new Set([9, 10]);
const GOOD_NIGHTS = new Set([0, 1, 2]);

const dayAgo = (ago: number) => {
  const date = new Date(`${NEWEST_DAY}T18:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - ago);
  return date.toISOString();
};

const sleepOf = (ago: number): LogItem["sleep"]["quality"] => {
  if (GOOD_NIGHTS.has(ago)) {
    return "very_good";
  }
  return ROUGH_NIGHTS.has(ago) ? "bad" : "neutral";
};

const items: LogItem[] = Array.from({ length: DAYS }, (_, ago) => {
  const iso = dayAgo(ago);
  const people = PEOPLE.filter(
    (person) =>
      (person.id === "recap-sam" && SAM.has(ago)) ||
      (person.id === "recap-rosa" && ROSA.has(ago)) ||
      (person.id === "recap-lena" && LENA.has(ago))
  ).map((person) => ({ id: person.id }));
  return {
    id: `recap-moment-${ago}`,
    date: iso.slice(0, 10),
    dateTime: iso,
    createdAt: iso,
    rating: SPORT.has(ago) ? "very_good" : "good",
    message: "",
    sleep: { quality: sleepOf(ago) },
    tags: [
      { id: "recap-work" },
      ...(SPORT.has(ago) ? [{ id: "recap-sport" }] : []),
    ],
    people,
    emotions: [
      "calm",
      ...(PROUD.has(ago) ? ["proud"] : []),
      ...(STRESSED.has(ago) ? ["stressed"] : []),
    ],
    photos: [],
    location: ago === 1 ? POTSDAM : BERLIN,
  };
});

/**
 * Data that shows every moment in the week recap: Sam back after 6 weeks,
 * Rosa new, 25 days with Lena, Proud again, 3 weeks without Stressed,
 * Sport back, 3 good nights after rough ones, first check-in in Potsdam
 * (needs the location setting on). All steps and the reminder are on, so
 * no nudges show.
 */
export const withRecapMoments = (data: ImportData): ImportData => ({
  ...data,
  items,
  tags: TAGS,
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
});
