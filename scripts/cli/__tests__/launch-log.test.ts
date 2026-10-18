import { describe, expect, test } from "bun:test";
import { findIosFatalLine, judgeIosLaunch } from "../launch-log.ts";

// Compact `log stream` lines as the simulator prints them.
const line = (message: string) =>
  `2026-10-18 20:41:40.112 E  PixyPreview[8458:61a2c1] [com.facebook.react.log:javascript] ${message}`;
const NOISE = [
  "2026-10-18 20:40:32.655 Df PixyPreview[5714:610e0f] [com.apple.xpc:connection] activating connection",
  line("Running application main"),
  line("Warning: Each child in a list should have a unique key"),
].join("\n");

describe("iOS launch log", () => {
  test("1.99.0 crash fails with the JS cause", () => {
    const log = `${NOISE}\n${line("Unhandled JS Exception: Error: unknown format: #059669")}\n`;
    expect(judgeIosLaunch({ log, isRunning: false })).toEqual({
      status: "crashed",
      marker: "Unhandled JS Exception",
      detail: "Unhandled JS Exception: Error: unknown format: #059669",
    });
  });

  test("fatal line fails even while the process still runs", () => {
    const log = line("RCTFatalException: Unhandled JS Exception");
    expect(judgeIosLaunch({ log, isRunning: true }).status).toBe("crashed");
  });

  test("first fatal line wins", () => {
    const log = [
      line("Unhandled JS Exception: ReferenceError: x is not defined"),
      line("Terminating app due to uncaught exception 'RCTFatalException'"),
    ].join("\n");
    expect(findIosFatalLine(log)?.detail).toBe(
      "Unhandled JS Exception: ReferenceError: x is not defined"
    );
  });

  test("native uncaught exception counts as crash", () => {
    const log = line(
      "*** Terminating app due to uncaught exception 'NSInvalidArgumentException'"
    );
    expect(judgeIosLaunch({ log, isRunning: false }).status).toBe("crashed");
  });

  test("long stack stays short in the error", () => {
    const log = line(
      `Unhandled JS Exception: Error: boom ${"at f ".repeat(200)}`
    );
    expect(findIosFatalLine(log)?.detail.length).toBeLessThanOrEqual(303);
  });

  test("warnings with a live process pass", () => {
    expect(judgeIosLaunch({ log: NOISE, isRunning: true })).toEqual({
      status: "pass",
    });
  });

  test("quiet exit fails as exited", () => {
    expect(judgeIosLaunch({ log: NOISE, isRunning: false })).toEqual({
      status: "exited",
    });
  });
});
