// agent-device drives iOS apps through its XCTest runner app. The first UI
// command on a device builds, installs, and starts the runner: several
// minutes on first use, or after an Xcode or agent-device update. Later runs
// reuse the build. Android needs no runner build.
import { CliError } from "./shared.ts";

// Covers a first runner build. Longer means xcodebuild or the device is stuck.
const RUNNER_TIMEOUT_MS = 900_000;
// A progress line this often shows a runner build is not a hang.
const PROGRESS_INTERVAL_MS = 30_000;

const prepareRunnerArgs = (udid: string) => [
  "prepare",
  "ios-runner",
  "--platform",
  "ios",
  "--udid",
  udid,
  "--timeout",
  String(RUNNER_TIMEOUT_MS),
];

// Calls `report` with the elapsed seconds every `intervalMs` until `work`
// settles.
const withProgress = async <T>(
  work: Promise<T>,
  report: (seconds: number) => void,
  intervalMs = PROGRESS_INTERVAL_MS
) => {
  const start = Date.now();
  const timer = setInterval(
    () => report(Math.round((Date.now() - start) / 1000)),
    intervalMs
  );
  try {
    return await work;
  } finally {
    clearInterval(timer);
  }
};

// Keeps the cause of a failed runner start and adds where to look.
const toRunnerError = (error: Error) => {
  const cause =
    error instanceof CliError
      ? {
          fix: error.fix,
          why: `${error.status}: ${error.message}. ${error.why}`,
        }
      : { fix: "", why: error.message };
  return new CliError({
    fix: `${cause.fix ? `${cause.fix} ` : ""}Read runner.log in the session directory of \`bunx agent-device session\`, then retry. A finished runner build is reused.`,
    message: "The agent-device runner did not start",
    status: "ios_runner_not_ready",
    why: cause.why,
  });
};

export {
  PROGRESS_INTERVAL_MS,
  RUNNER_TIMEOUT_MS,
  prepareRunnerArgs,
  toRunnerError,
  withProgress,
};
