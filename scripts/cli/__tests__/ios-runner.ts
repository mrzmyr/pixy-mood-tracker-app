import {
  PROGRESS_INTERVAL_MS,
  RUNNER_TIMEOUT_MS,
  prepareRunnerArgs,
  toRunnerError,
  withProgress,
} from "../ios-runner.ts";
import { CliError } from "../shared.ts";

afterEach(() => {
  jest.useRealTimers();
});

describe("prepareRunnerArgs", () => {
  it("pins the device and passes the runner build budget", () => {
    expect(prepareRunnerArgs("device-1")).toEqual([
      "prepare",
      "ios-runner",
      "--platform",
      "ios",
      "--udid",
      "device-1",
      "--timeout",
      String(RUNNER_TIMEOUT_MS),
    ]);
  });

  it("allows a first runner build longer than the verify window", () => {
    expect(RUNNER_TIMEOUT_MS).toBeGreaterThan(120_000);
  });
});

describe("withProgress", () => {
  it("reports elapsed seconds until the work settles", async () => {
    jest.useFakeTimers();
    const reports: number[] = [];
    const work = Promise.withResolvers<string>();
    const result = withProgress(work.promise, (seconds) =>
      reports.push(seconds)
    );
    jest.advanceTimersByTime(PROGRESS_INTERVAL_MS * 2);
    work.resolve("ready");
    await expect(result).resolves.toBe("ready");
    jest.advanceTimersByTime(PROGRESS_INTERVAL_MS * 2);
    expect(reports).toEqual([30, 60]);
  });

  it("stops reporting when the work fails", async () => {
    jest.useFakeTimers();
    const report = jest.fn();
    await expect(
      withProgress(Promise.reject(new Error("boom")), report)
    ).rejects.toThrow("boom");
    jest.advanceTimersByTime(PROGRESS_INTERVAL_MS * 2);
    expect(report).not.toHaveBeenCalled();
  });
});

describe("toRunnerError", () => {
  it("keeps the status, message, why, and fix of an agent-device error", () => {
    const error = toRunnerError(
      new CliError({
        fix: "Unlock the device.",
        message: "agent-device prepare timed out",
        status: "agent_device_timeout",
        why: "No answer within 930s.",
      })
    );
    expect(error).toBeInstanceOf(CliError);
    expect(error.status).toBe("ios_runner_not_ready");
    expect(error.message).toBe("The agent-device runner did not start");
    expect(error.why).toBe(
      "agent_device_timeout: agent-device prepare timed out. No answer within 930s."
    );
    expect(error.fix).toMatch(/^Unlock the device\. Read runner\.log/u);
  });

  it("wraps an unknown error", () => {
    const error = toRunnerError(new Error("spawn failed"));
    expect(error.why).toBe("spawn failed");
    expect(error.fix).toMatch(/^Read runner\.log/u);
  });
});
