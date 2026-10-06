import dayjs from "dayjs";
import type { HealthSource, SleepSample } from "@/features/health";

// Bedtime drift per earlier night in minutes, newest first. Stays within the
// 15 minute grace, so the bedtime part scores full.
const BEDTIME_DRIFT = [0, 5, -10, 10, -5, 0, 15, -15, 5, -5, 10, 0, -10, 5];

/**
 * One night with watch stages from 23:00 (+ `drift` minutes) on the day
 * before `date`: 7 h 05 min asleep (core 4 h, deep 1 h 05 min, REM 2 h),
 * two wake-ups of 8 and 7 minutes.
 */
const night = (date: dayjs.Dayjs, drift: number): SleepSample[] => {
  const onset = date.subtract(1, "day").hour(23).minute(0).add(drift, "minute");
  const parts: [SleepSample["stage"], number][] = [
    ["core", 40],
    ["deep", 35],
    ["core", 45],
    ["rem", 30],
    ["awake", 8],
    ["core", 60],
    ["deep", 30],
    ["core", 50],
    ["rem", 40],
    ["awake", 7],
    ["core", 45],
    ["rem", 50],
  ];
  let start = onset;
  return parts.map(([stage, minutes]) => {
    const end = start.add(minutes, "minute");
    const sample = { stage, start: start.toDate(), end: end.toDate() };
    start = end;
    return sample;
  });
};

/**
 * Stands in for Apple Health in preview builds: 14 nights of watch sleep
 * ending this morning, without the Health access sheet. Last night scores
 * 90, "Good".
 */
export const fakeHealthSource: HealthSource = {
  isAvailable: () => true,
  requestSleepAccess: () => Promise.resolve(),
  getSleepSamples: (start, end) => {
    const today = dayjs().startOf("day");
    const samples: SleepSample[] = [];
    for (const [index, drift] of BEDTIME_DRIFT.entries()) {
      for (const sample of night(today.subtract(index, "day"), drift)) {
        if (sample.start >= start && sample.start < end) {
          samples.push(sample);
        }
      }
    }
    return Promise.resolve(samples);
  },
};
