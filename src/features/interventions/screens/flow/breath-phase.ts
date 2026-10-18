import type { BreathStep } from "../../catalog";

/** Short pause before the first inhale. */
export const READY_MS = 1500;

/** Ready pause plus all rounds. */
export const getBreathTotalMs = (step: BreathStep) =>
  READY_MS + step.cycles * (step.inhaleSec + step.exhaleSec) * 1000;

/** Where a breathing step is at a point in time. */
export interface BreathPhase {
  phase: "ready" | "in" | "out";
  /** 0-based round. */
  cycle: number;
  /** Time left in this phase. */
  phaseLeftMs: number;
}

/** Phase of a breathing step after `elapsedMs`, including the ready pause. */
export const getBreathPhase = (
  step: BreathStep,
  elapsedMs: number
): BreathPhase => {
  if (elapsedMs < READY_MS) {
    return { phase: "ready", cycle: 0, phaseLeftMs: READY_MS - elapsedMs };
  }
  const inMs = step.inhaleSec * 1000;
  const cycleMs = inMs + step.exhaleSec * 1000;
  const breathing = Math.min(elapsedMs - READY_MS, step.cycles * cycleMs - 1);
  const cycle = Math.floor(breathing / cycleMs);
  const within = breathing % cycleMs;
  return within < inMs
    ? { phase: "in", cycle, phaseLeftMs: inMs - within }
    : { phase: "out", cycle, phaseLeftMs: cycleMs - within };
};
