import type { Person } from "@/features/people";
import type { OrbitSlide } from "./types";

/** Orbit sizes as shares of the canvas width. Same on screen and in the share image. */
export const ORBIT_SIZE = {
  self: 0.22,
  /** Smallest planet. */
  planetMin: 0.1,
  /** Planet of the person with the most days. */
  planetMax: 0.17,
  /** Radius of the inner orbit. */
  nearest: 0.31,
  /** Radius of the outer orbit. */
  farthest: 0.44,
};

/** Radius of the middle orbit. */
const MIDDLE = (ORBIT_SIZE.nearest + ORBIT_SIZE.farthest) / 2;

/** First word of a name: full names crowd the orbit. */
export const firstName = (name: string) => name.trim().split(/\s+/u)[0] ?? name;

/** One person placed on the orbit. */
export interface Planet {
  person: Person;
  days: number;
  size: number;
  radius: number;
  /** Start angle, radians. */
  angle: number;
}

/**
 * Inner orbit from 2/3 closeness, middle from 1/3, else outer. A few shared
 * orbits read clearer than one ring per person.
 */
const orbitOf = (closeness: number) => {
  if (closeness >= 2 / 3) {
    return ORBIT_SIZE.nearest;
  }
  return closeness >= 1 / 3 ? MIDDLE : ORBIT_SIZE.farthest;
};

/**
 * Planet area follows the share of the top person's days, so a person with
 * half the days gets half the area. `closeness` (0 to 1, 1 nearest) picks
 * the orbit; default is the same share of days. Planets sit evenly around
 * the user in `connected` order, first at the top, so neighbors never touch.
 */
export const placePlanets = (
  connected: OrbitSlide["people"],
  people: ReadonlyMap<string, Person>,
  width: number,
  closeness?: (personId: string) => number
): Planet[] => {
  const rows = connected.flatMap(({ personId, days }) => {
    const person = people.get(personId);
    return person ? [{ person, days }] : [];
  });
  const most = Math.max(1, ...rows.map((row) => row.days));
  return rows.map(({ person, days }, index) => {
    const share = days / most;
    return {
      person,
      days,
      size: Math.round(
        width *
          Math.max(
            ORBIT_SIZE.planetMin,
            ORBIT_SIZE.planetMax * Math.sqrt(share)
          )
      ),
      radius: width * orbitOf(closeness?.(person.id) ?? share),
      angle: -Math.PI / 2 + (index * 2 * Math.PI) / rows.length,
    };
  });
};
