import { createStructuredError } from "@/lib/errors";

/** Error for a Health call that failed; `cause` is the HealthKit message. */
export const createHealthError = (action: string, cause: string) =>
  createStructuredError({
    status: "health_unavailable",
    message: `Apple Health ${action} failed`,
    why: cause,
    fix: "Check that Apple Health is set up on this iPhone, then try again",
  });
