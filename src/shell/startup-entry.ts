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
