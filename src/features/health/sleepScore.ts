import dayjs from "dayjs";
import type { SLEEP_QUALITY_MAPPING } from "@/constants/Ratings";

/** Sleep quality of an entry, `very_bad` to `very_good`. */
export type SleepQuality = keyof typeof SLEEP_QUALITY_MAPPING;

/**
 * One sleep analysis sample from Apple Health, reduced to what the score
 * needs. `asleep` covers unspecified, core, deep, and REM sleep. `inBed`
 * comes from the iPhone sleep schedule without a watch.
 */
export interface SleepSample {
  kind: "inBed" | "asleep" | "awake";
  /** `true` for core, deep, and REM: a tracker wrote sleep stages. */
  isStaged: boolean;
  start: Date;
  end: Date;
}

/** Main sleep of one night. */
export interface NightSummary {
  /** Fall-asleep time. */
  onset: Date;
  /** Minutes asleep. Time in bed when the night holds only `inBed` samples. */
  asleepMinutes: number;
  /** Awake gaps of at least `MIN_WAKE_UP_MINUTES` between onset and wake. */
  wakeUps: number;
  /** Minutes awake between onset and wake. */
  awakeMinutes: number;
  /**
   * `true` when a tracker wrote stages or awake samples, so awake gaps are
   * real. Time in bed and unspecified sleep say nothing about wake-ups.
   */
  hasInterruptions: boolean;
}

/** Points per part, as in Apple's Sleep Score. */
export const SLEEP_SCORE_POINTS = {
  duration: 50,
  bedtime: 30,
  interruptions: 20,
} as const;

/** Full duration points from this many minutes asleep (7 h 50 min). */
const DURATION_TARGET_MINUTES = 470;
/** Duration points lost per minute below the target: 13 points per 2 hours. */
const DURATION_POINTS_PER_MINUTE = 13 / 120;
/** Bedtime shift without a deduction. */
const BEDTIME_GRACE_MINUTES = 15;
/** Bedtime points lost per 5 minutes beyond the grace. */
const BEDTIME_MINUTES_PER_POINT = 5;
/** Nights before this one that set the usual bedtime. */
export const BEDTIME_HISTORY_NIGHTS = 13;
/** Fewer earlier nights than this leave bedtime out of the score. */
const MIN_BEDTIME_HISTORY_NIGHTS = 3;
const POINTS_PER_WAKE_UP = 2;
const AWAKE_MINUTES_PER_POINT = 10;
/** Shorter awake gaps are normal sleep transitions, not wake-ups. */
const MIN_WAKE_UP_MINUTES = 5;
/** Gaps up to this long join sleep into one session; longer gaps split it. */
const MAX_SESSION_GAP_MINUTES = 120;
/** A night runs from 18:00 the day before the entry to 18:00 on its day. */
const NIGHT_START_HOUR = 18;

const MINUTE = 60_000;

/** Score bands, high to low, as in Apple's Sleep Score. */
const QUALITY_BANDS: { min: number; quality: SleepQuality }[] = [
  { min: 96, quality: "very_good" },
  { min: 81, quality: "good" },
  { min: 61, quality: "neutral" },
  { min: 41, quality: "bad" },
  { min: 0, quality: "very_bad" },
];

interface Interval {
  start: number;
  end: number;
}

const minutes = (ms: number) => ms / MINUTE;

const clamp = (value: number, max: number) => Math.min(max, Math.max(0, value));

/** Joins overlapping intervals. Watch and other apps can write the same night twice. */
const mergeIntervals = (intervals: Interval[]): Interval[] => {
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: Interval[] = [];
  for (const interval of sorted) {
    const last = merged.at(-1);
    if (last !== undefined && interval.start <= last.end) {
      last.end = Math.max(last.end, interval.end);
    } else {
      merged.push({ ...interval });
    }
  }
  return merged;
};

/** Splits sleep into sessions at gaps longer than `MAX_SESSION_GAP_MINUTES`. */
const toSessions = (intervals: Interval[]): Interval[][] => {
  const sessions: Interval[][] = [];
  for (const interval of intervals) {
    const session = sessions.at(-1);
    const last = session?.at(-1);
    if (
      session !== undefined &&
      last !== undefined &&
      minutes(interval.start - last.end) <= MAX_SESSION_GAP_MINUTES
    ) {
      session.push(interval);
    } else {
      sessions.push([interval]);
    }
  }
  return sessions;
};

const sessionMinutes = (session: Interval[]) =>
  session.reduce(
    (sum, interval) => sum + minutes(interval.end - interval.start),
    0
  );

/**
 * Start and end of the night before `date` (`YYYY-MM-DD`): 18:00 the day
 * before to 18:00 on `date`, local time.
 */
export const getNightWindow = (date: string) => {
  const end = dayjs(date).hour(NIGHT_START_HOUR).startOf("hour");
  return { start: end.subtract(1, "day").toDate(), end: end.toDate() };
};

/**
 * Main sleep in `samples`: the longest session. Naps and a second short
 * sleep do not count. Returns `null` without sleep.
 */
export const summarizeNight = (samples: SleepSample[]): NightSummary | null => {
  const toInterval = (sample: SleepSample) => ({
    start: sample.start.getTime(),
    end: sample.end.getTime(),
  });
  const asleep = samples.filter((sample) => sample.kind === "asleep");
  // Without a watch the iPhone writes only time in bed.
  const source =
    asleep.length > 0
      ? asleep
      : samples.filter((sample) => sample.kind === "inBed");
  const sessions = toSessions(mergeIntervals(source.map(toInterval)));
  if (sessions.length === 0) {
    return null;
  }
  let [main] = sessions;
  for (const session of sessions) {
    if (sessionMinutes(session) > sessionMinutes(main)) {
      main = session;
    }
  }

  let wakeUps = 0;
  let awakeMinutes = 0;
  for (let index = 1; index < main.length; index += 1) {
    const gap = minutes(main[index].start - main[index - 1].end);
    awakeMinutes += gap;
    if (gap >= MIN_WAKE_UP_MINUTES) {
      wakeUps += 1;
    }
  }

  return {
    onset: new Date(main[0].start),
    asleepMinutes: Math.round(sessionMinutes(main)),
    wakeUps,
    awakeMinutes: Math.round(awakeMinutes),
    hasInterruptions:
      asleep.length > 0 &&
      samples.some((sample) => sample.isStaged || sample.kind === "awake"),
  };
};

/** Minutes after noon, so 23:30 and 00:30 lie 60 minutes apart. */
const minutesAfterNoon = (date: Date) =>
  (date.getHours() * 60 + date.getMinutes() + 12 * 60) % (24 * 60);

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
};

/** Score parts in points. `null` leaves a part out of the score. */
export interface SleepScore {
  /** 0 to 100. */
  score: number;
  quality: SleepQuality;
  duration: number;
  bedtime: number | null;
  interruptions: number | null;
}

/**
 * Own version of Apple's Sleep Score. Apple has no API for its score, and
 * the formula is not public. Parts follow Apple's description:
 *
 * - Duration, 50 points: full from 7 h 50 min asleep, minus 13 per 2 hours less
 * - Bedtime, 30 points: fall-asleep time against the median of up to 13
 *   earlier nights. Minus 1 per 5 minutes beyond a 15 minute shift. Left out
 *   with fewer than 3 earlier nights
 * - Interruptions, 20 points: minus 2 per wake-up, minus 1 per 10 minutes
 *   awake. Left out when the night has no stages, see `hasInterruptions`
 *
 * Parts left out scale the rest to 100. The score maps to a quality with
 * Apple's bands: 96+ Very High, 81+ High, 61+ OK, 41+ Low, else Very Low.
 */
export const scoreSleep = ({
  night,
  earlierOnsets,
}: {
  night: NightSummary;
  /** Fall-asleep times of earlier nights, newest first. */
  earlierOnsets: Date[];
}): SleepScore => {
  const duration = clamp(
    SLEEP_SCORE_POINTS.duration -
      Math.max(0, DURATION_TARGET_MINUTES - night.asleepMinutes) *
        DURATION_POINTS_PER_MINUTE,
    SLEEP_SCORE_POINTS.duration
  );

  const history = earlierOnsets.slice(0, BEDTIME_HISTORY_NIGHTS);
  let bedtime: number | null = null;
  if (history.length >= MIN_BEDTIME_HISTORY_NIGHTS) {
    const usual = median(history.map(minutesAfterNoon));
    const shift = Math.abs(minutesAfterNoon(night.onset) - usual);
    bedtime = clamp(
      SLEEP_SCORE_POINTS.bedtime -
        Math.max(0, shift - BEDTIME_GRACE_MINUTES) / BEDTIME_MINUTES_PER_POINT,
      SLEEP_SCORE_POINTS.bedtime
    );
  }

  const interruptions = night.hasInterruptions
    ? clamp(
        SLEEP_SCORE_POINTS.interruptions -
          night.wakeUps * POINTS_PER_WAKE_UP -
          night.awakeMinutes / AWAKE_MINUTES_PER_POINT,
        SLEEP_SCORE_POINTS.interruptions
      )
    : null;

  let points = duration;
  let maxPoints: number = SLEEP_SCORE_POINTS.duration;
  if (bedtime !== null) {
    points += bedtime;
    maxPoints += SLEEP_SCORE_POINTS.bedtime;
  }
  if (interruptions !== null) {
    points += interruptions;
    maxPoints += SLEEP_SCORE_POINTS.interruptions;
  }
  const score = Math.round((points / maxPoints) * 100);
  const band = QUALITY_BANDS.find(({ min }) => score >= min);

  return {
    score,
    quality: band?.quality ?? "very_bad",
    duration,
    bedtime,
    interruptions,
  };
};
