// Compare a recapture with the cached PNG. Not a hash input: tuning the
// budget never invalidates the cache.
import { decodePng } from "./png.ts";

/**
 * Noise budget of a recapture. iOS 26 Liquid Glass halos of native header
 * buttons render with up to about 5 levels of per-launch noise, even with
 * Reduce Transparency; measured 2k px, most at 1 level. Any content change
 * (text, layout, color) exceeds 8 levels.
 */
export const NOISE_BUDGET = { maxDelta: 8, maxShare: 0.002 } as const;

/** Largest channel difference and changed pixel count of two PNGs. */
export const measureNoise = (before: Buffer, after: Buffer) => {
  const a = decodePng(before);
  const b = decodePng(after);
  if (a.width !== b.width || a.height !== b.height) {
    return { maxDelta: 255, pixels: a.width * a.height, isWithinBudget: false };
  }
  let maxDelta = 0;
  let pixels = 0;
  for (let offset = 0; offset < a.data.length; offset += 4) {
    let delta = 0;
    for (let channel = 0; channel < 3; channel += 1) {
      delta = Math.max(
        delta,
        Math.abs(a.data[offset + channel] - b.data[offset + channel])
      );
    }
    if (delta > 0) {
      pixels += 1;
      maxDelta = Math.max(maxDelta, delta);
    }
  }
  return {
    maxDelta,
    pixels,
    isWithinBudget:
      maxDelta <= NOISE_BUDGET.maxDelta &&
      pixels <= NOISE_BUDGET.maxShare * a.width * a.height,
  };
};
