import * as Sentry from "@sentry/react-native";
import { Observe } from "expo-observe";

import type { StructuredError } from "@/lib/errors";

/**
 * Copy for Observe without `why` and `fix`: `why` can quote stored user data.
 * `status` leads the message, so Observe groups by it. Stack and name stay
 * for symbolication.
 */
export const toObserveError = (error: StructuredError) => {
  const observeError = new Error(`${String(error.status)}: ${error.message}`);
  observeError.name = error.name;
  observeError.stack = error.stack;
  return observeError;
};

/**
 * Only caller of `Sentry.captureException` and `Observe.reportError`. Use it
 * for every error the app catches and recovers from. Wrap raw caught values
 * in `createStructuredError` first. Sentry gets the full
 * `StructuredError`; Observe dispatch follows analytics consent through
 * `configureObserve`.
 */
export const reportError = (error: StructuredError) => {
  Sentry.captureException(error);
  Observe.reportError(toObserveError(error));
};
