/**
 * Small rigid-body physics for story slides, run on the UI thread each
 * frame. Semi-implicit Euler: velocity first, then position. Contacts
 * resolve with a restitution impulse (how much speed a bounce keeps) and a
 * position correction, so bodies never sink into each other. Fixed
 * substeps keep the result the same at 60 and 120 Hz.
 */

/** Seconds per physics step. Frames run as many steps as fit. */
export const PHYSICS_STEP = 1 / 240;
/** Longest frame the simulation catches up on, so a hitch never explodes. */
const MAX_FRAME = 1 / 20;
/** Below this speed a body at rest stops: no endless micro bounces. */
const SLEEP_SPEED = 12;
/** Landing slower than this rests instead of bouncing: gravity's pull per frame. */
const RESTING_SPEED = 40;

// ---------------------------------------------------------------- pipes

/**
 * Pixels falling in invisible pipes, one pipe per day. A pipe is a little
 * wider than a pixel, so a pixel can tip from wall to wall while it falls.
 * Heights count up from the floor to the pixel's bottom edge.
 */
export interface PipeWorld {
  /** Pipe of each pixel. */
  pipe: number[];
  /** Pixel below in the same pipe, or -1 on the floor. */
  below: number[];
  /** Seconds from start until the pixel drops in. */
  dropAt: number[];
  /** Bottom edge above the floor. */
  y: number[];
  vy: number[];
  /** Offset from the pipe center, within the pipe's play. */
  x: number[];
  vx: number[];
  /** Dropped in yet. */
  live: boolean[];
  /** Seconds since start. */
  time: number;
}

/** Pixel size and the feel of the fall. */
export interface PipeConfig {
  /** Pixel side. */
  size: number;
  /** Gap between stacked pixels. */
  gap: number;
  /** Height above the floor where pixels drop in. */
  dropHeight: number;
  /** Free space between pixel and pipe wall, on each side. */
  play: number;
  gravity: number;
  /** Share of speed a bounce keeps, 0 to 1. */
  restitution: number;
}

/**
 * Pipes with `counts[pipe]` pixels each. Pipes start one after another,
 * pixels in a pipe drop one after another, bottom pixel first.
 */
export const createPipeWorld = (
  counts: number[],
  delay: { start: number; pipe: number; pixel: number },
  config: PipeConfig
): PipeWorld => {
  const world: PipeWorld = {
    pipe: [],
    below: [],
    dropAt: [],
    y: [],
    vy: [],
    x: [],
    vx: [],
    live: [],
    time: 0,
  };
  for (const [pipe, count] of counts.entries()) {
    for (let level = 0; level < count; level += 1) {
      const index = world.pipe.length;
      world.pipe.push(pipe);
      world.below.push(level === 0 ? -1 : index - 1);
      world.dropAt.push(delay.start + pipe * delay.pipe + level * delay.pixel);
      world.y.push(config.dropHeight);
      world.vy.push(0);
      // A small sideways nudge, different per pixel, so walls come into play.
      world.x.push(0);
      world.vx.push((((index * 37) % 11) - 5) * 6);
      world.live.push(false);
    }
  }
  return world;
};

/** Drops a pixel in once its time came. False while it still waits. */
const isPixelIn = (world: PipeWorld, index: number) => {
  "worklet";
  if (!world.live[index] && world.time >= (world.dropAt[index] ?? 0)) {
    world.live[index] = true;
  }
  return world.live[index] ?? false;
};

/** Gravity, motion, and a soft bounce off the pipe walls. */
const movePixel = (
  world: PipeWorld,
  index: number,
  dt: number,
  config: PipeConfig
) => {
  "worklet";
  world.vy[index] = (world.vy[index] ?? 0) - config.gravity * dt;
  world.y[index] = (world.y[index] ?? 0) + (world.vy[index] ?? 0) * dt;
  world.x[index] = (world.x[index] ?? 0) + (world.vx[index] ?? 0) * dt;
  const x = world.x[index] ?? 0;
  if (Math.abs(x) > config.play) {
    world.x[index] = Math.sign(x) * config.play;
    world.vx[index] = -(world.vx[index] ?? 0) * 0.4;
  }
};

/** Velocity change when a pixel lands on the floor or the pixel below. */
const bounce = (
  world: PipeWorld,
  index: number,
  below: number,
  config: PipeConfig
) => {
  "worklet";
  const own = world.vy[index] ?? 0;
  const under = below >= 0 ? (world.vy[below] ?? 0) : 0;
  if (under - own < RESTING_SPEED) {
    // Resting contact: it rides on what holds it, no bounce.
    world.vy[index] = Math.abs(under) < SLEEP_SPEED ? 0 : under;
  } else if (below >= 0) {
    // Equal masses: the two pixels trade speed, minus the loss.
    const mean = (own + under) / 2;
    const half = ((under - own) * config.restitution) / 2;
    world.vy[index] = mean + half;
    world.vy[below] = mean - half;
  } else {
    world.vy[index] = -own * config.restitution;
  }
};

/** Keeps a pixel on top of the floor or the pixel below it. */
const landPixel = (
  world: PipeWorld,
  index: number,
  dt: number,
  config: PipeConfig
) => {
  "worklet";
  const pixelBelow = world.below[index] ?? -1;
  const below = pixelBelow >= 0 && world.live[pixelBelow] ? pixelBelow : -1;
  const support =
    below >= 0 ? (world.y[below] ?? 0) + config.size + config.gap : 0;
  if ((world.y[index] ?? 0) >= support) {
    return;
  }
  world.y[index] = support;
  bounce(world, index, below, config);
  // Contact rubs the sideways drift away and centers the pixel.
  world.vx[index] = (world.vx[index] ?? 0) * (1 - 6 * dt);
  world.x[index] = (world.x[index] ?? 0) * (1 - 2 * dt);
};

/** Still moving: falling, bouncing, or drifting off center. */
const isPixelMoving = (world: PipeWorld, index: number) => {
  "worklet";
  return (
    Math.abs(world.vy[index] ?? 0) > SLEEP_SPEED ||
    Math.abs(world.vx[index] ?? 0) > 1 ||
    Math.abs(world.x[index] ?? 0) > 0.5
  );
};

/** Advances the pipes by `seconds`. Returns false once every pixel rests. */
export const stepPipes = (
  world: PipeWorld,
  seconds: number,
  config: PipeConfig
) => {
  "worklet";
  let remaining = Math.min(seconds, MAX_FRAME);
  let moving = false;
  while (remaining > 0) {
    const dt = Math.min(PHYSICS_STEP, remaining);
    remaining -= dt;
    world.time += dt;
    moving = false;
    for (let index = 0; index < world.y.length; index += 1) {
      if (!isPixelIn(world, index)) {
        moving = true;
        continue;
      }
      movePixel(world, index, dt, config);
      landPixel(world, index, dt, config);
      if (isPixelMoving(world, index)) {
        moving = true;
      }
    }
  }
  return moving;
};

// ---------------------------------------------------------------- bubbles

/**
 * Balloons on soft tethers: no gravity, each pulled to its resting spot,
 * bumping into the others. Positions are centers, in points from the
 * area's top left corner.
 */
export interface BubbleWorld {
  radius: number[];
  /** Resting spot each balloon floats back to. */
  homeX: number[];
  homeY: number[];
  dropAt: number[];
  x: number[];
  y: number[];
  vx: number[];
  vy: number[];
  live: boolean[];
  time: number;
}

/** Area size and the feel of the balloons. */
export interface BubbleConfig {
  width: number;
  height: number;
  /** Pull back to the resting spot, per second squared: a soft tether. */
  tether: number;
  restitution: number;
  /** Air drag per second: how fast a balloon calms down. */
  drag: number;
}

/**
 * Balloons that float in one after another from the left and right edges,
 * each toward its resting spot. Spots are centers, in points.
 */
export const createBubbleWorld = (
  radii: number[],
  homes: { x: number; y: number }[],
  delay: { start: number; each: number },
  config: BubbleConfig
): BubbleWorld => ({
  radius: radii,
  homeX: homes.map((home) => home.x),
  homeY: homes.map((home) => home.y),
  dropAt: radii.map((_, index) => delay.start + index * delay.each),
  // Odd balloons come from the left, even ones from the right.
  x: radii.map((radius, index) =>
    index % 2 === 1 ? -radius - 8 : config.width + radius + 8
  ),
  // A little below their spot, so they drift up as they come in.
  y: homes.map((home) => home.y + 40),
  vx: radii.map(() => 0),
  vy: radii.map(() => 0),
  live: radii.map(() => false),
  time: 0,
});

/** Contact passes per step: more passes, steadier piles. */
const SOLVER_PASSES = 4;

/** Drops a bubble in once its time came. False while it still waits. */
const isBubbleIn = (world: BubbleWorld, index: number) => {
  "worklet";
  if (!world.live[index] && world.time >= (world.dropAt[index] ?? 0)) {
    world.live[index] = true;
  }
  return world.live[index] ?? false;
};

/** Tether pull and air drag, then motion. */
const moveBubble = (
  world: BubbleWorld,
  index: number,
  dt: number,
  config: BubbleConfig
) => {
  "worklet";
  const keep = 1 - config.drag * dt;
  const pullX =
    ((world.homeX[index] ?? 0) - (world.x[index] ?? 0)) * config.tether;
  const pullY =
    ((world.homeY[index] ?? 0) - (world.y[index] ?? 0)) * config.tether;
  world.vx[index] = ((world.vx[index] ?? 0) + pullX * dt) * keep;
  world.vy[index] = ((world.vy[index] ?? 0) + pullY * dt) * keep;
  world.x[index] = (world.x[index] ?? 0) + (world.vx[index] ?? 0) * dt;
  world.y[index] = (world.y[index] ?? 0) + (world.vy[index] ?? 0) * dt;
};

/** Pushes two touching bubbles apart and lets them bump. */
const hitPair = (
  world: BubbleWorld,
  a: number,
  b: number,
  config: BubbleConfig
) => {
  "worklet";
  const { x, y, vx, vy, radius } = world;
  const ra = radius[a] ?? 0;
  const rb = radius[b] ?? 0;
  const ax = x[a] ?? 0;
  const ay = y[a] ?? 0;
  const bx = x[b] ?? 0;
  const by = y[b] ?? 0;
  const distance = Math.hypot(bx - ax, by - ay) || 0.0001;
  const overlap = ra + rb - distance;
  if (overlap <= 0) {
    return;
  }
  const nx = (bx - ax) / distance;
  const ny = (by - ay) / distance;
  // Mass grows with area: big bubbles push small ones aside.
  const ma = ra * ra;
  const mb = rb * rb;
  const share = mb / (ma + mb);
  x[a] = ax - nx * overlap * share;
  y[a] = ay - ny * overlap * share;
  x[b] = bx + nx * overlap * (1 - share);
  y[b] = by + ny * overlap * (1 - share);
  const avx = vx[a] ?? 0;
  const avy = vy[a] ?? 0;
  const bvx = vx[b] ?? 0;
  const bvy = vy[b] ?? 0;
  const closing = (bvx - avx) * nx + (bvy - avy) * ny;
  if (closing >= 0) {
    return;
  }
  const impulse = (-(1 + config.restitution) * closing) / (1 / ma + 1 / mb);
  vx[a] = avx - (impulse / ma) * nx;
  vy[a] = avy - (impulse / ma) * ny;
  vx[b] = bvx + (impulse / mb) * nx;
  vy[b] = bvy + (impulse / mb) * ny;
};

/** Resolves every contact a few times, so piles stay steady. */
const solveContacts = (world: BubbleWorld, config: BubbleConfig) => {
  "worklet";
  const count = world.radius.length;
  for (let pass = 0; pass < SOLVER_PASSES; pass += 1) {
    for (let a = 0; a < count; a += 1) {
      if (!world.live[a]) {
        continue;
      }
      for (let b = a + 1; b < count; b += 1) {
        if (world.live[b]) {
          hitPair(world, a, b, config);
        }
      }
    }
  }
};

/** Advances the bubbles by `seconds`. Returns false once all rest. */
export const stepBubbles = (
  world: BubbleWorld,
  seconds: number,
  config: BubbleConfig
) => {
  "worklet";
  const count = world.radius.length;
  let remaining = Math.min(seconds, MAX_FRAME);
  let moving = false;
  while (remaining > 0) {
    const dt = Math.min(PHYSICS_STEP, remaining);
    remaining -= dt;
    world.time += dt;
    moving = false;
    for (let index = 0; index < count; index += 1) {
      if (isBubbleIn(world, index)) {
        moveBubble(world, index, dt, config);
      } else {
        moving = true;
      }
    }
    solveContacts(world, config);
    for (let index = 0; index < count; index += 1) {
      const speed = Math.hypot(world.vx[index] ?? 0, world.vy[index] ?? 0);
      if (world.live[index] && speed > SLEEP_SPEED) {
        moving = true;
      }
    }
  }
  return moving;
};

/** Runs a world until it rests, for reduced motion and tests. */
export const settle = (step: (seconds: number) => boolean, maxSeconds = 30) => {
  "worklet";
  for (let time = 0; time < maxSeconds; time += MAX_FRAME) {
    if (!step(MAX_FRAME)) {
      return true;
    }
  }
  return false;
};
