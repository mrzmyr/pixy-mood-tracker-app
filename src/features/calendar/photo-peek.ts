import { useSyncExternalStore } from "react";
import type { LogPhoto } from "@/types";

/**
 * Photo peek: a long press on a calendar spot without a pixel (empty slot,
 * day without entry, future day) shows a photo of its day on every pixel
 * that has photos. Release ends the peek.
 *
 * `seed` is `null` while no peek runs. Each peek gets a new seed, so each
 * long press picks other photos.
 */
let seed: number | null = null;
const listeners = new Set<() => void>();

const setSeed = (next: number | null) => {
  seed = next;
  for (const listener of listeners) {
    listener();
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSeed = () => seed;

/** Starts a peek with a new seed. Calls during a peek pick new photos. */
export const startPhotoPeek = () => setSeed(Math.random());

/** Ends the peek. Safe to call when no peek runs, for example on every press out. */
export const stopPhotoPeek = () => {
  if (seed !== null) {
    setSeed(null);
  }
};

/** Seed of the running peek, `null` when none runs. */
export const usePhotoPeekSeed = () =>
  useSyncExternalStore(subscribe, getSeed, getSeed);

/**
 * Random photo of one day for the peek with `seed`. Stays the same for one
 * seed and day, so re-renders during a peek keep the photo. `null` when the
 * day has no photos.
 */
export const pickPeekPhoto = ({
  photos,
  seed: peekSeed,
  dateString,
}: {
  photos: LogPhoto[];
  seed: number;
  dateString: string;
}) => {
  if (photos.length === 0) {
    return null;
  }
  let hash = Math.floor(peekSeed * 2 ** 31);
  for (let index = 0; index < dateString.length; index += 1) {
    hash = (hash * 31 + (dateString.codePointAt(index) ?? 0)) % 2_147_483_647;
  }
  return photos[hash % photos.length];
};
