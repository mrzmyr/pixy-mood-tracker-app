import type { Person } from "@/features/people";
import { placePlanets } from "../story/orbit-layout";

const WIDTH = 300;

const setup = (days: number[]) => {
  const connected = days.map((count, index) => ({
    personId: `p${index}`,
    days: count,
  }));
  const people = new Map(
    connected.map(({ personId }) => [
      personId,
      {
        id: personId,
        name: personId,
        avatar: null,
        createdAt: "2026-01-01T00:00:00.000Z",
      } satisfies Person,
    ])
  );
  return { connected, people };
};

describe("Orbit layout", () => {
  it("puts people on at most 3 orbits", () => {
    const { connected, people } = setup([20, 17, 14, 11, 9, 6, 3, 1]);
    const planets = placePlanets(connected, people, WIDTH);
    const orbits = new Set(planets.map((planet) => planet.radius));
    expect(orbits.size).toBeLessThanOrEqual(3);
  });

  it("gives people with equal days equal planets, even far below the top", () => {
    const { connected, people } = setup([20, 4, 4, 4]);
    const [top, ...rest] = placePlanets(connected, people, WIDTH);
    expect(new Set(rest.map((planet) => planet.size)).size).toBe(1);
    expect(new Set(rest.map((planet) => planet.radius)).size).toBe(1);
    expect(top?.size).toBeGreaterThan(rest[0]?.size ?? 0);
  });

  it("keeps a close second almost as big as the top", () => {
    const { connected, people } = setup([10, 9, 1]);
    const [top, second] = placePlanets(connected, people, WIDTH);
    expect((second?.size ?? 0) / (top?.size ?? 1)).toBeGreaterThan(0.9);
  });

  it("takes the orbit from closeness when given", () => {
    const { connected, people } = setup([10, 1]);
    const planets = placePlanets(connected, people, WIDTH, (id) =>
      id === "p1" ? 1 : 0
    );
    expect(planets[1]?.radius).toBeLessThan(planets[0]?.radius ?? 0);
    expect(planets[1]?.size).toBeLessThan(planets[0]?.size ?? 0);
  });
});
