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
  {
    id: "recap-kai",
    name: "Kai",
    avatar: null,
    createdAt: "2026-01-01T09:00:00.000Z",
  },
  {
    id: "recap-mira",
    name: "Mira",
    avatar: null,
    createdAt: "2026-01-01T09:00:00.000Z",
  },
];

const TAGS: Tag[] = [
  { id: "recap-work", title: "Work", color: "blue" },
  { id: "recap-sport", title: "Sport", color: "green" },
];

const BERLIN = { latitude: 52.52, longitude: 13.4, name: "Mitte, Berlin" };
const LISBON = { latitude: 38.71, longitude: -9.14, name: "Baixa, Lisbon" };
const POTSDAM = {
  latitude: 52.39,
  longitude: 13.1,
  name: "Babelsberg, Potsdam",
};

/** Days before the newest day, per moment it triggers. */
const SAM = new Set([3, 45, 47, 50, 52, 55]);
const ROSA = new Set([2]);
// 24 connected days before, then day 4: crosses 25.
const LENA = new Set([
  4,
  ...Array.from({ length: 24 }, (_, index) => 8 + index * 3),
]);
const SPORT = new Set([2, 3, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58]);
const STRESSED = new Set([30, 35, 40, 45, 50, 55]);
const PROUD = new Set([1, 70]);
const GRATEFUL = new Set([3, 6]);
const BEST_DAY = 5;
// People for "People and mood" in the year recap: 4+ people with 5+
// connected days.
const KAI = new Set([20, 25, 30, 35, 40, 45, 50, 55, 60]);
const MIRA = new Set([15, 22, 29, 36, 43, 50, 57, 64]);
const LISBON_TRIP = new Set([7, 8]);

const dayAgo = (ago: number) => {
  const date = new Date(`${NEWEST_DAY}T18:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - ago);
  return date.toISOString();
};

// Lena: neutral days early in the fixture, very good days later.
const LENA_LIFT_FROM = 40;

const ratingOf = (ago: number): LogItem["rating"] => {
  if (ago === BEST_DAY) {
    return "extremely_good";
  }
  if (SPORT.has(ago)) {
    return "very_good";
  }
  if (LENA.has(ago)) {
    return ago <= LENA_LIFT_FROM ? "very_good" : "neutral";
  }
  return "good";
};

const placeOf = (ago: number) => {
  if (ago === 1) {
    return POTSDAM;
  }
  return LISBON_TRIP.has(ago) ? LISBON : BERLIN;
};

const days: LogItem[] = Array.from({ length: DAYS }, (_, ago) => {
  const iso = dayAgo(ago);
  const people = PEOPLE.flatMap((person) =>
    (person.id === "recap-sam" && SAM.has(ago)) ||
    (person.id === "recap-rosa" && ROSA.has(ago)) ||
    (person.id === "recap-lena" && LENA.has(ago)) ||
    (person.id === "recap-kai" && KAI.has(ago)) ||
    (person.id === "recap-mira" && MIRA.has(ago))
      ? [{ id: person.id }]
      : []
  );
  return {
    id: `recap-moment-${ago}`,
    date: iso.slice(0, 10),
    dateTime: iso,
    createdAt: iso,
    rating: ratingOf(ago),
    message: "",
    sleep: { quality: "neutral" },
    tags: [
      { id: "recap-work" },
      ...(SPORT.has(ago) ? [{ id: "recap-sport" }] : []),
    ],
    people,
    emotions: [
      "calm",
      ...(PROUD.has(ago) ? ["proud"] : []),
      ...(GRATEFUL.has(ago) ? ["grateful"] : []),
      ...(STRESSED.has(ago) ? ["stressed"] : []),
    ],
    photos: [],
    location: placeOf(ago),
  };
});

/**
 * Data that shows every moment in the month recap: Sam back after 6 weeks,
 * Rosa new, 25 days connected with Lena, Proud again, Sport back, first
 * check-in in Potsdam (needs the location setting on). Summaries: a best
 * day, emotions, people, and a Lisbon trip this month. The year recap has
 * what moves your mood and people and mood. All steps and the reminder are
 * on, so no nudges show.
 */
export const withRecapMoments = (data: ImportData): ImportData => ({
  ...data,
  items: days,
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
