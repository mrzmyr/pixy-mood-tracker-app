import type { HealthSource } from "./healthSource";

/** Apple Health exists only on iOS. Other platforms read no sleep. */
export const systemHealthSource: HealthSource = {
  isAvailable: () => false,
  requestSleepAccess: () => Promise.resolve(),
  getSleepSamples: () => Promise.resolve([]),
};
