import type { Person } from "@/features/people";
import type { OrbitSlide } from "./types";

/** Orbit sizes as shares of the canvas width. Same on screen and in the share image. */
export const ORBIT_SIZE = {
  self: 0.22,
  /** Planet of the person with the fewest days. */
  planetMin: 0.1,
  /** Planet of the person with the most days. */
  planetMax: 0.17,
  /** Orbit radius of the person with the most days. */
  nearest: 0.31,
  /** Orbit radius of the person with the fewest days. */
  farthest: 0.44,
};

/** First word of a name: full names crowd the orbit. */
export const firstName = (name: string) => name.trim().split(/\s+/u)[0] ?? name;

const lerp = (from: number, to: number, share: number) =>
  from + (to - from) * share;

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
 * Size and distance follow the share of the top person's days. Planets sit
 * evenly around the user, most days at the top, so neighbors never touch.
 */
export const placePlanets = (
  slide: OrbitSlide,
  people: ReadonlyMap<string, Person>,
  width: number
): Planet[] => {
  const rows = slide.people.flatMap(({ personId, days }) => {
    const person = people.get(personId);
    return person ? [{ person, days }] : [];
  });
  const most = rows[0]?.days ?? 1;
  const least = rows.at(-1)?.days ?? most;
  return rows.map(({ person, days }, index) => {
    const share = most === least ? 1 : (days - least) / (most - least);
    return {
      person,
      days,
      size: Math.round(
        width * lerp(ORBIT_SIZE.planetMin, ORBIT_SIZE.planetMax, share)
      ),
      radius: width * lerp(ORBIT_SIZE.farthest, ORBIT_SIZE.nearest, share),
      angle: -Math.PI / 2 + (index * 2 * Math.PI) / rows.length,
    };
  });
};
