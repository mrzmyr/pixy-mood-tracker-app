import * as Sentry from "@sentry/react-native";
import type { StructuredError } from "@/lib/errors";
import { createStructuredError } from "@/lib/errors";

/**
 * Fields every logged error must expose (see "Errors" in AGENTS.md). Accepts
 * both `StructuredError` instances and plain objects such as
 * `SupportFlowError`.
 */
export interface LoggableError {
  status: string | number;
  message: string;
  why: string;
  fix: string;
}

const isStructuredError = (value: unknown): value is StructuredError =>
  value instanceof Error &&
  "status" in value &&
  "why" in value &&
  "fix" in value;

const toError = (error: LoggableError): StructuredError =>
  error instanceof Error ? error : createStructuredError(error);

const errorMessage = (cause: unknown) =>
  cause instanceof Error ? cause.message : String(cause);

/**
 * Wrap an unknown caught value in a structured error. Returns `cause`
 * unchanged when it is already structured, so wrapping preserves its fields.
 * Otherwise keeps `cause` so the original stack stays inspectable.
 */
export const toStructuredError = (
  cause: unknown,
  fields: Omit<LoggableError, "why"> & { why?: string }
): StructuredError =>
  isStructuredError(cause)
    ? cause
    : Object.assign(
        createStructuredError({
          ...fields,
          why: fields.why ?? errorMessage(cause),
        }),
        { cause }
      );

/**
 * App logger. The only place that calls `console` or reports to Sentry.
 *
 * - `debug`: development console only. Safe for user data, which never
 *   leaves the device.
 * - `warn`: expected or user-caused failures (cancelled share, unavailable
 *   splash screen). Console only.
 * - `error`: unexpected failures. Console and Sentry. Never put personal
 *   data in the error fields.
 */
export const logger = {
  debug: (message: string, ...details: unknown[]) => {
    if (__DEV__) {
      console.log(message, ...details);
    }
  },
  warn: (error: LoggableError) => {
    console.warn(toError(error));
  },
  error: (error: LoggableError) => {
    const structuredError = toError(error);
    console.error(structuredError);
    try {
      Sentry.captureException(structuredError, {
        tags: { status: String(structuredError.status) },
        extra: { why: structuredError.why, fix: structuredError.fix },
      });
    } catch (captureError) {
      console.error(
        createStructuredError({
          status: "telemetry_failed",
          message: "Error reporting failed",
          why: `Sentry failed while reporting "${structuredError.status}": ${errorMessage(captureError)}`,
          fix: "Check the Sentry SDK configuration",
        })
      );
    }
  },
};
