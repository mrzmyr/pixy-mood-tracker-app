import dayjs from "dayjs";
import type { LogItem } from "@/features/logs";
import { daysBetween, getDayRating } from "../days";
import { distanceKm, parsePlace } from "../places";
import { THRESHOLDS } from "../thresholds";
import type {
  ConnectedPerson,
  EmotionCount,
  RecapDay,
  RecapInput,
  SummaryCard,
  Trip,
} from "../types";

const HARDER_DAY_MAX = 2;

const hasExtremelyGood = (day: RecapDay) =>
  day.items.some((item) => item.rating === "extremely_good");

const emotionsOf = (day: RecapDay) =>
  new Set(day.items.flatMap((item) => item.emotions));

/**
 * One day told like the day view. Best day: an extremely good day, the one
 * with most emotions and entries. Without one, the hardest day at bad or
 * worse, told with care. Week recaps also look back a year, to an
 * extremely good day only.
 */
export const dayRecap = (input: RecapInput): SummaryCard[] => {
  const cards: SummaryCard[] = [];
  const [best] = input.days
    .filter(hasExtremelyGood)
    .sort(
      (a, b) =>
        emotionsOf(b).size - emotionsOf(a).size ||
        b.items.length - a.items.length
    );
  const [hardest] = [...input.days].sort(
    (a, b) => getDayRating(a) - getDayRating(b)
  );
  if (best) {
    cards.push({ type: "day-recap", mode: "best", date: best.date });
  } else if (hardest && getDayRating(hardest) <= HARDER_DAY_MAX) {
    cards.push({ type: "day-recap", mode: "hard", date: hardest.date });
  }
  if (input.period.kind === "week") {
    const from = dayjs(input.period.start)
      .subtract(1, "year")
      .format("YYYY-MM-DD");
    const to = dayjs(input.period.end).subtract(1, "year").format("YYYY-MM-DD");
    const yearAgo = input.history.findLast(
      (day) => day.date >= from && day.date <= to && hasExtremelyGood(day)
    );
    if (yearAgo) {
      cards.push({ type: "day-recap", mode: "ago", date: yearAgo.date });
    }
  }
  return cards;
};

/** Days per emotion, most used first. Ties keep first appearance. */
const countEmotions = (days: RecapDay[]): EmotionCount[] => {
  const counts = new Map<string, number>();
  for (const day of days) {
    for (const emotion of emotionsOf(day)) {
      counts.set(emotion, (counts.get(emotion) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([emotion, count]) => ({ emotion, days: count }))
    .sort((a, b) => b.days - a.days);
};

/** Most used emotions of the period, 3+ different ones. */
export const emotions = (input: RecapInput): SummaryCard[] => {
  if (!input.steps.has("emotions")) {
    return [];
  }
  const counts = countEmotions(input.days);
  return counts.length >= THRESHOLDS.emotionsMinDifferent
    ? [{ type: "emotions", counts }]
    : [];
};

const hasPerson = (personId: string) => (item: LogItem) =>
  item.people.some((person) => person.id === personId);

/** People of the period by connected days, with top 2 emotions then. */
const connectedPeople = (input: RecapInput): ConnectedPerson[] => {
  const ids = new Set(
    input.days.flatMap((day) =>
      day.items.flatMap((item) => item.people.map((person) => person.id))
    )
  );
  return [...ids]
    .map((personId) => {
      const days = input.days.filter((day) =>
        day.items.some(hasPerson(personId))
      );
      return {
        personId,
        days: days.length,
        emotions: countEmotions(days)
          .slice(0, 2)
          .map((count) => count.emotion),
      };
    })
    .sort((a, b) => b.days - a.days);
};

const peopleOn = (input: RecapInput) =>
  input.steps.has("people") && input.availableSteps.has("people");

/** Everyone connected in the period, most connected first. */
export const connected = (input: RecapInput): SummaryCard[] => {
  const people = peopleOn(input) ? connectedPeople(input) : [];
  return people.length > 0 ? [{ type: "connected", people }] : [];
};

/** Top 3 people by connected days, from 2 people on. */
export const mostConnected = (input: RecapInput): SummaryCard[] => {
  const people = peopleOn(input) ? connectedPeople(input).slice(0, 3) : [];
  return people.length >= THRESHOLDS.mostConnectedMinPeople
    ? [{ type: "most-connected", people }]
    : [];
};

/** Place the user checks in from most: the most common city name. */
const getHome = (history: RecapDay[]) => {
  const counts = new Map<
    string,
    { count: number; location: NonNullable<LogItem["location"]> }
  >();
  for (const day of history) {
    for (const item of day.items) {
      const city = parsePlace(item.location?.name)?.city;
      if (city && item.location) {
        const current = counts.get(city);
        counts.set(city, {
          count: (current?.count ?? 0) + 1,
          location: current?.location ?? item.location,
        });
      }
    }
  }
  const [home] = [...counts.values()].sort((a, b) => b.count - a.count);
  return home?.location ?? null;
};

/**
 * Trips of the period: days with a place 25+ km from home, merged per
 * city across gaps of up to 2 days. Location on.
 */
export const placesTrips = (input: RecapInput): SummaryCard[] => {
  const home = input.locationEnabled ? getHome(input.history) : null;
  if (!home) {
    return [];
  }
  const trips: Trip[] = [];
  for (const day of input.days) {
    const away = day.items.find(
      (item) =>
        item.location &&
        parsePlace(item.location.name) &&
        distanceKm(home, item.location) > THRESHOLDS.tripMinKm
    );
    const city = parsePlace(away?.location?.name)?.city;
    if (city) {
      const last = trips.at(-1);
      if (
        last &&
        last.city === city &&
        daysBetween(last.end, day.date) <= THRESHOLDS.tripMaxGapDays + 1
      ) {
        last.end = day.date;
        last.days += 1;
      } else {
        trips.push({ city, start: day.date, end: day.date, days: 1 });
      }
    }
  }
  return trips.length > 0 ? [{ type: "places-trips", trips }] : [];
};
