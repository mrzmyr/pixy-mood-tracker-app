import {
  CategoryValueSleepAnalysis,
  isHealthDataAvailable,
  queryCategorySamples,
  requestAuthorization,
} from "@kingstinct/react-native-healthkit";
import type { HealthSource } from "./healthSource";
import { createHealthError } from "./healthError";
import type { SleepStage } from "./sleepScore";

const SLEEP = "HKCategoryTypeIdentifierSleepAnalysis";

const toStage = (value: number): SleepStage => {
  switch (value) {
    case CategoryValueSleepAnalysis.inBed: {
      return "inBed";
    }
    case CategoryValueSleepAnalysis.awake: {
      return "awake";
    }
    case CategoryValueSleepAnalysis.asleepCore: {
      return "core";
    }
    case CategoryValueSleepAnalysis.asleepDeep: {
      return "deep";
    }
    case CategoryValueSleepAnalysis.asleepREM: {
      return "rem";
    }
    default: {
      return "asleep";
    }
  }
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
        stage: toStage(sample.value),
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
