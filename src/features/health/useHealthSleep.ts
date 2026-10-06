import * as Sentry from "@sentry/react-native";
import { useEffect, useState } from "react";
import { getHealthSource } from "./healthSource";
import { getSleepFromHealth } from "./sleepFromHealth";
import type { HealthSleep } from "./sleepFromHealth";

/**
 * Sleep of the night before `date` (`YYYY-MM-DD`) from Apple Health, while
 * `isEnabled`. `null` while loading, without sleep data, or after an error.
 */
export const useHealthSleep = (date: string, isEnabled: boolean) => {
  const [sleep, setSleep] = useState<HealthSleep | null>(null);

  useEffect(() => {
    if (!isEnabled) {
      return;
    }
    let isCurrent = true;
    void (async () => {
      try {
        const result = await getSleepFromHealth(getHealthSource(), date);
        if (isCurrent) {
          setSleep(result);
        }
      } catch (error) {
        // The step still works by hand; report and stay empty.
        Sentry.captureException(error);
      }
    })();
    return () => {
      isCurrent = false;
    };
  }, [date, isEnabled]);

  return isEnabled ? sleep : null;
};
