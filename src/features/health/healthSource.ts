import type { SleepSample } from "./sleepScore";
import { systemHealthSource } from "./systemHealthSource";

/**
 * OS boundary of the Apple Health feature. Preview builds swap it for a fake
 * (`src/dev/fakeHealthSource.ts`), because tests cannot drive the Health
 * permission sheet and simulators hold no sleep data.
 */
export interface HealthSource {
  /** `true` on devices with Apple Health: iPhones, not iPads or Android. */
  isAvailable: () => boolean;
  /**
   * Shows the Health sheet for read access to sleep, once per install.
   * HealthKit never tells apps whether the user allowed reading, so this
   * resolves either way. Rejects only when the sheet fails to open.
   */
  requestSleepAccess: () => Promise<void>;
  /** Sleep samples that start between `start` and `end`. Empty without access. */
  getSleepSamples: (start: Date, end: Date) => Promise<SleepSample[]>;
}

let override: HealthSource | null = null;

/** Replaces Apple Health until the app restarts. `null` restores it. */
export const setHealthSourceOverride = (source: HealthSource | null) => {
  override = source;
};

/** Returns the active source: the override, else Apple Health. */
export const getHealthSource = () => override ?? systemHealthSource;
