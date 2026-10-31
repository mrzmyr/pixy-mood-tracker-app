import {
  createBubbleWorld,
  createPipeWorld,
  settle,
  stepBubbles,
  stepPipes,
} from "../story/physics";

const PIPE = {
  size: 40,
  gap: 6,
  dropHeight: 600,
  play: 3,
  gravity: 2600,
  restitution: 0.35,
};

describe("pixels in pipes", () => {
  test("come to rest stacked on the floor, in the middle of their pipe", () => {
    const world = createPipeWorld(
      [3, 1, 5],
      { start: 0, pipe: 0.2, pixel: 0.1 },
      PIPE
    );

    expect(settle((seconds) => stepPipes(world, seconds, PIPE))).toBe(true);
    const levels = world.pipe.map(
      (_, index) =>
        world.pipe.slice(0, index).filter((pipe) => pipe === world.pipe[index])
          .length
    );
    for (const [index, level] of levels.entries()) {
      expect(world.y[index]).toBeCloseTo(level * (PIPE.size + PIPE.gap), 0);
      expect(Math.abs(world.x[index] ?? 0)).toBeLessThanOrEqual(PIPE.play);
    }
  });

  test("bounce up after landing, lower each time", () => {
    const world = createPipeWorld([1], { start: 0, pipe: 0, pixel: 0 }, PIPE);
    const peaks: number[] = [];
    let rising = false;
    let last = world.y[0] ?? 0;
    for (let frame = 0; frame < 240; frame += 1) {
      stepPipes(world, 1 / 60, PIPE);
      const y = world.y[0] ?? 0;
      if (rising && y < last) {
        peaks.push(last);
      }
      rising = y > last;
      last = y;
    }

    expect(peaks.length).toBeGreaterThan(0);
    expect(peaks[0]).toBeLessThan(PIPE.dropHeight);
    expect(
      peaks.every(
        (peak, index) => index === 0 || peak < (peaks[index - 1] ?? 0)
      )
    ).toBe(true);
  });
});

describe("balloons on tethers", () => {
  const AREA = {
    width: 350,
    height: 420,
    tether: 9,
    restitution: 0.45,
    drag: 2.4,
  };
  const radii = [77, 63, 56, 56, 46, 42];
  const homes = [
    { x: 175, y: 126 },
    { x: 84, y: 218 },
    { x: 266, y: 210 },
    { x: 175, y: 294 },
    { x: 287, y: 328 },
    { x: 63, y: 336 },
  ];

  test("float in from both sides and settle near their spots without overlapping", () => {
    const world = createBubbleWorld(
      radii,
      homes,
      { start: 0, each: 0.3 },
      AREA
    );

    expect(world.x[0]).toBeGreaterThan(AREA.width);
    expect(world.x[1]).toBeLessThan(0);
    expect(settle((seconds) => stepBubbles(world, seconds, AREA))).toBe(true);
    for (const [a, ra] of radii.entries()) {
      const x = world.x[a] ?? 0;
      const y = world.y[a] ?? 0;
      expect(
        Math.hypot(x - (homes[a]?.x ?? 0), y - (homes[a]?.y ?? 0))
      ).toBeLessThan(ra);
      for (const [b, rb] of radii.entries()) {
        if (b > a) {
          const distance = Math.hypot(
            (world.x[b] ?? 0) - x,
            (world.y[b] ?? 0) - y
          );
          expect(distance).toBeGreaterThan(ra + rb - 1.5);
        }
      }
    }
  });
});
