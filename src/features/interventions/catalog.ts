import type {
  InterventionCluster,
  InterventionLength,
} from "@/state/analytics/events";

/** Breathing: circle grows on inhale, shrinks on exhale. */
export interface BreathStep {
  type: "breath";
  inhaleSec: number;
  exhaleSec: number;
  cycles: number;
  /** Shows "Three slow breaths to close" above the circle. */
  isClosing?: boolean;
}

/** Thinking prompt with an example, no typing. */
export interface PromptStep {
  type: "prompt";
  /** Text keys: `interventions_<id>_<key>_title|body|example`. */
  key: string;
  /** Progress bar fills over this time. Pacing hint only, Next stays on. */
  minSec: number;
}

/** Text with a countdown; moves on by itself. */
export interface TimedStep {
  type: "timed";
  /** Text keys: `interventions_<id>_<key>_part|text`. */
  key: string;
  sec: number;
}

/** Steps run one at a time; each type has its own screen. */
export type InterventionStep = BreathStep | PromptStep | TimedStep;

/**
 * One guided exercise. Text keys: `interventions_<id>_title|short|lead|
 * science` and `interventions_<id>_what_<1..whatCount>`.
 */
export interface Intervention {
  id: InterventionId;
  cluster: InterventionCluster;
  length: InterventionLength;
  minutes: number;
  whatCount: number;
  steps: InterventionStep[];
}

/** Stable: sent to analytics and used in text keys. Never rename. */
export type InterventionId = "slow_breath" | "worry_check" | "body_scan";

const closingBreaths: BreathStep = {
  type: "breath",
  inhaleSec: 4,
  exhaleSec: 6,
  cycles: 3,
  isClosing: true,
};

/** Every intervention by id. Copy lives in `en.json`. */
export const INTERVENTIONS: Record<InterventionId, Intervention> = {
  slow_breath: {
    id: "slow_breath",
    cluster: "anxiety",
    length: "quick",
    minutes: 1,
    whatCount: 3,
    steps: [{ type: "breath", inhaleSec: 4, exhaleSec: 6, cycles: 6 }],
  },
  worry_check: {
    id: "worry_check",
    cluster: "anxiety",
    length: "medium",
    minutes: 4,
    whatCount: 4,
    steps: [
      { type: "prompt", key: "name", minSec: 20 },
      { type: "prompt", key: "likely", minSec: 25 },
      { type: "prompt", key: "control", minSec: 25 },
      { type: "prompt", key: "step", minSec: 20 },
      closingBreaths,
    ],
  },
  body_scan: {
    id: "body_scan",
    cluster: "anxiety",
    length: "long",
    minutes: 8,
    whatCount: 3,
    steps: [
      { type: "timed", key: "settle", sec: 45 },
      { type: "timed", key: "feet", sec: 60 },
      { type: "timed", key: "legs", sec: 60 },
      { type: "timed", key: "belly", sec: 60 },
      { type: "timed", key: "chest", sec: 60 },
      { type: "timed", key: "arms", sec: 60 },
      { type: "timed", key: "face", sec: 75 },
      { type: "timed", key: "whole", sec: 60 },
    ],
  },
};

/** Check an untrusted value, for example a route parameter. */
export const isInterventionId = (value: unknown): value is InterventionId =>
  typeof value === "string" && Object.hasOwn(INTERVENTIONS, value);

/**
 * Emotion keys per cluster, in priority order: the first cluster with a
 * match wins. Disabled emotion keys stay listed because older entries still
 * carry them.
 */
export const CLUSTERS: { cluster: InterventionCluster; emotions: string[] }[] =
  [
    {
      cluster: "anxiety",
      emotions: [
        "anxious",
        "nervous",
        "worried",
        "apprehensive",
        "concerned",
        "uneasy",
        "jittery",
        "restless",
        "tense",
        "scared",
        "frightened",
        "fearful",
      ],
    },
  ];

/** Quick and medium fit right after saving; long waits for the calendar. */
export const OPTIONS: Record<
  InterventionCluster,
  { confirmation: InterventionId[]; calendar: InterventionId[] }
> = {
  anxiety: {
    confirmation: ["slow_breath", "worry_check"],
    calendar: ["slow_breath", "worry_check", "body_scan"],
  },
};
