import dayjs from "dayjs";
import type { HealthSource } from "./healthSource";
import type { NightSummary, SleepSample, SleepScore } from "./sleepScore";
import {
  BEDTIME_HISTORY_NIGHTS,
  getNightWindow,
  scoreSleep,
  summarizeNight,
} from "./sleepScore";

/** Last night's sleep from Apple Health with its score. */
export interface HealthSleep {
  night: NightSummary;
  score: SleepScore;
}

/**
 * Reads the night before `date` (`YYYY-MM-DD`) and the 13 nights before it
 * from `source`, then scores the night. `null` when the night holds no
 * sleep, also when the user did not allow reading sleep.
 */
export const getSleepFromHealth = async (
  source: HealthSource,
  date: string
): Promise<HealthSleep | null> => {
  const [last, ...earlier] = Array.from(
    { length: BEDTIME_HISTORY_NIGHTS + 1 },
    (_, index) =>
      getNightWindow(dayjs(date).subtract(index, "day").format("YYYY-MM-DD"))
  );
  const samples = await source.getSleepSamples(
    getNightWindow(
      dayjs(date).subtract(BEDTIME_HISTORY_NIGHTS, "day").format("YYYY-MM-DD")
    ).start,
    last.end
  );
  const inWindow = ({ start, end }: { start: Date; end: Date }) =>
    samples.filter(
      (sample: SleepSample) => sample.start >= start && sample.start < end
    );

  const night = summarizeNight(inWindow(last));
  if (night === null) {
    return null;
  }
  const earlierOnsets = earlier
    .map((window) => summarizeNight(inWindow(window))?.onset)
    .filter((onset): onset is Date => onset !== undefined);

  return { night, score: scoreSleep({ night, earlierOnsets }) };
};
