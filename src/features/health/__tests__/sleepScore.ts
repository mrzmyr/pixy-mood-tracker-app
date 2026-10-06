import { getSleepFromHealth } from "../sleepFromHealth";
import type { HealthSource } from "../healthSource";
import type { NightSummary, SleepSample } from "../sleepScore";
import { scoreSleep, summarizeNight } from "../sleepScore";

// Local time, so tests match the device's night window in any time zone.
const at = (day: number, hour: number, minute = 0) =>
  new Date(2026, 9, day, hour, minute);

const sample = (
  stage: SleepSample["stage"],
  start: Date,
  end: Date
): SleepSample => ({ stage, start, end });

const night = (overrides: Partial<NightSummary> = {}): NightSummary => ({
  onset: at(5, 23),
  asleepMinutes: 480,
  wakeUps: 0,
  awakeMinutes: 0,
  hasInterruptions: true,
  stages: [{ stage: "core", minutes: 480 }],
  ...overrides,
});

/** Same fall-asleep time on `count` earlier nights. */
const onsets = (count: number, hour = 23, minute = 0) =>
  Array.from({ length: count }, (_, index) => at(4 - index, hour, minute));

describe("summarizeNight()", () => {
  test("adds up sleep stages and counts the awake gap between them", () => {
    const summary = summarizeNight([
      sample("core", at(5, 23), at(6, 2)),
      sample("awake", at(6, 2), at(6, 2, 20)),
      sample("core", at(6, 2, 20), at(6, 7)),
    ]);

    expect(summary).toEqual({
      onset: at(5, 23),
      asleepMinutes: 460,
      wakeUps: 1,
      awakeMinutes: 20,
      hasInterruptions: true,
      stages: [
        { stage: "awake", minutes: 20 },
        { stage: "core", minutes: 460 },
      ],
    });
  });

  test("counts overlapping samples from two apps once", () => {
    const summary = summarizeNight([
      sample("asleep", at(5, 23), at(6, 6)),
      sample("asleep", at(6, 0), at(6, 7)),
    ]);

    expect(summary?.asleepMinutes).toBe(480);
  });

  test("ignores short awake gaps and an afternoon nap", () => {
    const summary = summarizeNight([
      sample("asleep", at(5, 23), at(6, 3)),
      sample("asleep", at(6, 3, 2), at(6, 7)),
      sample("asleep", at(6, 14), at(6, 15)),
    ]);

    expect(summary).toMatchObject({
      onset: at(5, 23),
      asleepMinutes: 478,
      wakeUps: 0,
    });
  });

  test("uses time in bed without a watch and knows no wake-ups", () => {
    const summary = summarizeNight([sample("inBed", at(5, 23), at(6, 6))]);

    expect(summary).toMatchObject({
      asleepMinutes: 420,
      hasInterruptions: false,
      stages: [{ stage: "inBed", minutes: 420 }],
    });
  });

  test("splits watch sleep into stages in Apple Health order", () => {
    const summary = summarizeNight([
      sample("inBed", at(5, 22, 50), at(6, 7, 10)),
      sample("core", at(5, 23), at(6, 1)),
      sample("deep", at(6, 1), at(6, 2)),
      sample("awake", at(6, 2), at(6, 2, 10)),
      sample("rem", at(6, 2, 10), at(6, 3)),
      sample("core", at(6, 3), at(6, 7)),
    ]);

    expect(summary?.stages).toEqual([
      { stage: "awake", minutes: 10 },
      { stage: "rem", minutes: 50 },
      { stage: "core", minutes: 360 },
      { stage: "deep", minutes: 60 },
    ]);
  });

  test("shows sleep without stages as one part next to awake time", () => {
    const summary = summarizeNight([
      sample("asleep", at(5, 23), at(6, 3)),
      sample("asleep", at(6, 3, 30), at(6, 7)),
    ]);

    expect(summary?.stages).toEqual([
      { stage: "awake", minutes: 30 },
      { stage: "asleep", minutes: 450 },
    ]);
  });

  test("returns null without sleep", () => {
    expect(summarizeNight([])).toBeNull();
  });
});

describe("scoreSleep()", () => {
  test("rates a long, regular, calm night Great", () => {
    const result = scoreSleep({ night: night(), earlierOnsets: onsets(13) });

    expect(result).toMatchObject({ score: 100, quality: "very_good" });
  });

  test("loses 13 duration points per 2 hours below 7 h 50 min", () => {
    const result = scoreSleep({
      night: night({ asleepMinutes: 350 }),
      earlierOnsets: onsets(13),
    });

    expect(result.duration).toBeCloseTo(37);
    expect(result.quality).toBe("good");
  });

  test("loses bedtime points when falling asleep late", () => {
    const usual = scoreSleep({ night: night(), earlierOnsets: onsets(13) });
    const late = scoreSleep({
      night: night({ onset: at(6, 1) }),
      earlierOnsets: onsets(13),
    });

    expect(usual.bedtime).toBe(30);
    expect(late.bedtime).toBe(9);
  });

  test("compares bedtimes across midnight", () => {
    const result = scoreSleep({
      night: night({ onset: at(6, 0, 10) }),
      earlierOnsets: onsets(13, 23, 55),
    });

    expect(result.bedtime).toBe(30);
  });

  test("loses interruption points per wake-up and awake time", () => {
    const result = scoreSleep({
      night: night({ wakeUps: 3, awakeMinutes: 40 }),
      earlierOnsets: onsets(13),
    });

    expect(result.interruptions).toBe(10);
  });

  test("leaves out bedtime and interruptions without the data", () => {
    const result = scoreSleep({
      night: night({ asleepMinutes: 300, hasInterruptions: false }),
      earlierOnsets: onsets(2),
    });

    expect(result).toMatchObject({ bedtime: null, interruptions: null });
    expect(result.score).toBe(63);
    expect(result.quality).toBe("neutral");
  });

  test("rates a short, broken night Not at all", () => {
    const result = scoreSleep({
      night: night({
        onset: at(6, 2),
        asleepMinutes: 240,
        wakeUps: 6,
        awakeMinutes: 90,
      }),
      earlierOnsets: onsets(13),
    });

    expect(result.quality).toBe("very_bad");
  });
});

const sourceWith = (samples: SleepSample[]): HealthSource => ({
  isAvailable: () => true,
  requestSleepAccess: () => Promise.resolve(),
  getSleepSamples: (start, end) =>
    Promise.resolve(
      samples.filter((item) => item.start >= start && item.start < end)
    ),
});

describe("getSleepFromHealth()", () => {
  test("scores the night before the entry day against earlier nights", async () => {
    const earlier = Array.from({ length: 13 }, (_, index) =>
      sample("asleep", at(4 - index, 23), at(5 - index, 7))
    );
    const source = sourceWith([
      ...earlier,
      sample("asleep", at(5, 23), at(6, 7)),
    ]);

    const result = await getSleepFromHealth(source, "2026-10-06");

    expect(result?.night.onset).toEqual(at(5, 23));
    expect(result?.score.bedtime).toBe(30);
    expect(result?.score.quality).toBe("very_good");
  });

  test("returns null when the night holds no sleep", async () => {
    const source = sourceWith([sample("asleep", at(3, 23), at(4, 7))]);

    expect(await getSleepFromHealth(source, "2026-10-06")).toBeNull();
  });
});
