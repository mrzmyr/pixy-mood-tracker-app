/** First screen a cold start leads to. */
export type StartupEntry = "home" | "onboarding" | "notification";

/** Picks the entry from facts known when stored data is ready. */
export const getStartupEntry = ({
  hasOnboarded,
  hasLaunchNotification,
}: {
  hasOnboarded: boolean;
  /** App launched from a notification tap. */
  hasLaunchNotification: boolean;
}): StartupEntry => {
  if (!hasOnboarded) {
    return "onboarding";
  }
  return hasLaunchNotification ? "notification" : "home";
};

/** Upper bounds of the entry count ranges sent with startup TTI. */
const ENTRY_COUNT_RANGES = [0, 30, 365, 1000, 3000] as const;

/**
 * Coarse entry count, for example `"31-365"`. Startup time grows with stored
 * data, so TTI needs this to compare like with like. A range, never the exact
 * count.
 */
export const getEntryCountRange = (count: number): string => {
  let lower = 0;
  for (const upper of ENTRY_COUNT_RANGES) {
    if (count <= upper) {
      return lower === upper ? `${upper}` : `${lower}-${upper}`;
    }
    lower = upper + 1;
  }
  return `${lower}+`;
};
