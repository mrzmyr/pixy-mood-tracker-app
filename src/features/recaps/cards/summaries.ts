import dayjs from "dayjs";
import { daysBetween, getDayRating } from "../days";
import { distanceKm, parsePlace } from "../places";
import { getPersonMoments } from "./moments";
import { THRESHOLDS } from "../thresholds";
import type {
  ConnectedPerson,
  DateKey,
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
    .flatMap((day) =>
      hasExtremelyGood(day) ? [{ day, emotions: emotionsOf(day).size }] : []
    )
    .sort(
      (a, b) =>
        b.emotions - a.emotions || b.day.items.length - a.day.items.length
    )
    .map(({ day }) => day);
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

/**
 * People of the period by connected days, with their top 2 emotions on
 * those days. Deleted people stay out. One pass over the days.
 */
const connectedPeople = (input: RecapInput): ConnectedPerson[] => {
  const daysByPerson = new Map<string, RecapDay[]>();
  for (const day of input.days) {
    const ids = new Set(
      day.items.flatMap((item) => item.people.map((person) => person.id))
    );
    for (const id of ids) {
      if (input.personIds.has(id)) {
        const personDays = daysByPerson.get(id);
        if (personDays) {
          personDays.push(day);
        } else {
          daysByPerson.set(id, [day]);
        }
      }
    }
  }
  return [...daysByPerson.entries()]
    .map(([personId, days]) => ({
      personId,
      days: days.length,
      emotions: countEmotions(days)
        .slice(0, 2)
        .map((count) => count.emotion),
    }))
    .sort((a, b) => b.days - a.days);
};

/** People step on and available. */
export const peopleOn = (input: RecapInput) =>
  input.steps.has("people") && input.availableSteps.has("people");

/**
 * Everyone connected in the period, most connected first. Each row carries
 * the person's moment (back, new, milestone), if any.
 */
export const connected = (input: RecapInput): SummaryCard[] => {
  if (!peopleOn(input)) {
    return [];
  }
  const moments = new Map(
    getPersonMoments(input).map((moment) => [moment.personId, moment])
  );
  const people = connectedPeople(input).map((person) => {
    const moment = moments.get(person.personId);
    return moment ? { ...person, moment } : person;
  });
  return people.length > 0 ? [{ type: "connected", people }] : [];
};

/** Top 3 people by connected days, from 2 people on. */
export const mostConnected = (input: RecapInput): SummaryCard[] => {
  const people = peopleOn(input) ? connectedPeople(input).slice(0, 3) : [];
  return people.length >= THRESHOLDS.mostConnectedMinPeople
    ? [{ type: "most-connected", people }]
    : [];
};

/** Home: the most common city name and the average point of its places. */
export const getHome = (history: RecapDay[]) => {
  const byCity = new Map<string, { latitude: number; longitude: number }[]>();
  for (const day of history) {
    for (const item of day.items) {
      const city = parsePlace(item.location?.name)?.city;
      if (city && item.location) {
        const points = byCity.get(city);
        if (points) {
          points.push(item.location);
        } else {
          byCity.set(city, [item.location]);
        }
      }
    }
  }
  const [home] = [...byCity.entries()].sort(
    ([, a], [, b]) => b.length - a.length
  );
  if (!home) {
    return null;
  }
  const [city, points] = home;
  return {
    city,
    latitude:
      points.reduce((sum, point) => sum + point.latitude, 0) / points.length,
    longitude:
      points.reduce((sum, point) => sum + point.longitude, 0) / points.length,
  };
};

/** A point on the map. */
interface Point {
  latitude: number;
  longitude: number;
}

/** Trip of the period with the points checked in there. */
export interface TripVisit extends Trip {
  points: Point[];
}

/** Spot of the period with its days and the points checked in there. */
export interface SpotVisit {
  name: string;
  dates: DateKey[];
  points: Point[];
}

/**
 * Trips and spots of the period with their points, `null` with location off
 * or without a home city.
 *
 * - Trips: days with a place 25+ km from home, outside the home city,
 *   merged per city across gaps of up to 2 days. A day checked in at home
 *   ends a trip
 * - Spots: every other place, most days first. Home city areas by
 *   district, nearby towns by name
 */
export const getPlaceVisits = (input: RecapInput) => {
  const home = input.locationEnabled ? getHome(input.history) : null;
  if (!home) {
    return null;
  }
  const trips: TripVisit[] = [];
  const spots = new Map<string, { dates: Set<DateKey>; points: Point[] }>();
  let open: TripVisit | null = null;
  for (const day of input.days) {
    const dayPlaces = day.items.flatMap((item) => {
      const place = parsePlace(item.location?.name);
      return item.location && place
        ? [{ ...place, location: item.location }]
        : [];
    });
    const away = dayPlaces.find(
      (place) =>
        place.city !== home.city &&
        distanceKm(home, place.location) > THRESHOLDS.tripMinKm
    );
    if (away) {
      if (
        open &&
        open.city === away.city &&
        daysBetween(open.end, day.date) <= THRESHOLDS.tripMaxGapDays + 1
      ) {
        open.end = day.date;
        open.days += 1;
        open.points.push(away.location);
      } else {
        open = {
          city: away.city,
          start: day.date,
          end: day.date,
          days: 1,
          points: [away.location],
        };
        trips.push(open);
      }
    } else if (dayPlaces.length > 0) {
      open = null;
    }
    for (const place of dayPlaces) {
      if (place !== away) {
        // Home city by district, nearby towns by name.
        const name =
          place.city === home.city
            ? (place.district ?? place.city)
            : place.city;
        const spot = spots.get(name) ?? { dates: new Set(), points: [] };
        spot.dates.add(day.date);
        spot.points.push(place.location);
        spots.set(name, spot);
      }
    }
  }
  return {
    home,
    trips,
    spots: [...spots.entries()]
      .map(([name, spot]) => ({
        name,
        dates: [...spot.dates],
        points: spot.points,
      }))
      .sort(
        (a, b) =>
          b.dates.length - a.dates.length || a.name.localeCompare(b.name)
      ),
  };
};

/**
 * Places of the period. Location on. Shows with a trip or 2+ spots; at most
 * 5 rows, trips first.
 */
export const places = (input: RecapInput): SummaryCard[] => {
  const visits = getPlaceVisits(input);
  if (
    !visits ||
    (visits.trips.length === 0 &&
      visits.spots.length < THRESHOLDS.placesMinSpots)
  ) {
    return [];
  }
  const trips = visits.trips
    .slice(0, THRESHOLDS.placesMaxRows)
    .map(({ points: _points, ...trip }) => trip);
  const spots = visits.spots
    .slice(0, Math.max(0, THRESHOLDS.placesMaxRows - trips.length))
    .map((spot) => ({ name: spot.name, days: spot.dates.length }));
  return [{ type: "places", trips, spots }];
};
