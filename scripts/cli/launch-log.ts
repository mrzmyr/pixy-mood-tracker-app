// Reads app logs from one launch and decides whether the app survived it.
// Release builds turn an uncaught JS error into a native crash, so the log
// line names the JS cause. Example from iOS 1.99.0:
//   Unhandled JS Exception: Error: unknown format: #059669

/** Log markers of a fatal launch on iOS, most specific first. */
const IOS_FATAL_MARKERS = [
  "Unhandled JS Exception",
  "RCTFatalException",
  "Terminating app due to uncaught exception",
] as const;

const MAX_DETAIL_LENGTH = 300;

/** Outcome of one watched launch. */
export type LaunchVerdict =
  | { status: "pass" }
  | { status: "crashed"; marker: string; detail: string }
  | { status: "exited" };

/** First fatal line in iOS log text, or null when the log has none. */
export const findIosFatalLine = (log: string) => {
  for (const line of log.split("\n")) {
    const marker = IOS_FATAL_MARKERS.find((item) => line.includes(item));
    if (marker) {
      const detail = line.slice(line.indexOf(marker)).trim();
      return {
        marker,
        detail:
          detail.length > MAX_DETAIL_LENGTH
            ? `${detail.slice(0, MAX_DETAIL_LENGTH)}...`
            : detail,
      };
    }
  }
  return null;
};

/**
 * Verdict after the watch window. A fatal log line wins over a live process:
 * iOS can log the JS error before it ends the app.
 */
export const judgeIosLaunch = ({
  log,
  isRunning,
}: {
  log: string;
  isRunning: boolean;
}): LaunchVerdict => {
  const fatal = findIosFatalLine(log);
  if (fatal) {
    return { status: "crashed", ...fatal };
  }
  return isRunning ? { status: "pass" } : { status: "exited" };
};
