import {
  CategoryValueSleepAnalysis,
  isHealthDataAvailable,
  queryCategorySamples,
  requestAuthorization,
} from "@kingstinct/react-native-healthkit";
import type { HealthSource } from "./healthSource";
import { createHealthError } from "./healthError";
import type { SleepSample } from "./sleepScore";

const SLEEP = "HKCategoryTypeIdentifierSleepAnalysis";

const STAGED = new Set<number>([
  CategoryValueSleepAnalysis.asleepCore,
  CategoryValueSleepAnalysis.asleepDeep,
  CategoryValueSleepAnalysis.asleepREM,
]);

const toKind = (value: number): SleepSample["kind"] => {
  if (value === CategoryValueSleepAnalysis.inBed) {
    return "inBed";
  }
  if (value === CategoryValueSleepAnalysis.awake) {
    return "awake";
  }
  return "asleep";
};

/** Apple Health through HealthKit. Pixy only reads sleep, never writes. */
export const systemHealthSource: HealthSource = {
  isAvailable: () => isHealthDataAvailable(),
  requestSleepAccess: async () => {
    try {
      await requestAuthorization({ toRead: [SLEEP] });
    } catch (error) {
      throw createHealthError(
        "access request",
        error instanceof Error ? error.message : String(error)
      );
    }
  },
  getSleepSamples: async (start, end) => {
    try {
      const samples = await queryCategorySamples(SLEEP, {
        limit: 0,
        filter: { date: { startDate: start, endDate: end } },
      });
      return samples.map((sample) => ({
        kind: toKind(sample.value),
        isStaged: STAGED.has(sample.value),
        start: sample.startDate,
        end: sample.endDate,
      }));
    } catch (error) {
      throw createHealthError(
        "sleep query",
        error instanceof Error ? error.message : String(error)
      );
    }
  },
};
