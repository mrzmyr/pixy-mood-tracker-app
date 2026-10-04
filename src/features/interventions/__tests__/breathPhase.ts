import type { BreathStep } from "../catalog";
import {
  getBreathPhase,
  getBreathTotalMs,
  READY_MS,
} from "../screens/Flow/breathPhase";

const step: BreathStep = {
  type: "breath",
  inhaleSec: 4,
  exhaleSec: 6,
  cycles: 2,
};

describe("getBreathPhase()", () => {
  test("starts with a ready pause, then inhales", () => {
    expect(getBreathPhase(step, 0)).toEqual({
      phase: "ready",
      cycle: 0,
      phaseLeftMs: READY_MS,
    });
    expect(getBreathPhase(step, READY_MS)).toEqual({
      phase: "in",
      cycle: 0,
      phaseLeftMs: 4000,
    });
  });

  test("exhales after the inhale and counts rounds", () => {
    expect(getBreathPhase(step, READY_MS + 5000)).toEqual({
      phase: "out",
      cycle: 0,
      phaseLeftMs: 5000,
    });
    expect(getBreathPhase(step, READY_MS + 10_000).cycle).toBe(1);
  });

  test("stays in the last round at the end", () => {
    expect(getBreathPhase(step, getBreathTotalMs(step))).toMatchObject({
      phase: "out",
      cycle: 1,
    });
  });
});
