import { z } from "zod";
import { createStructuredError } from "@/lib/errors";

/** Status of a cloud call that failed for lack of internet. */
export const OFFLINE_STATUS = "backup_offline";

/**
 * Status of a cloud call that Google Drive rejected: access revoked in the
 * Google account, or the token expired for good. The user must sign in again.
 */
export const SIGNED_OUT_STATUS = "backup_signed_out";

/**
 * What a failed cloud call left behind: a Google Sign-In or cloud library
 * error with `code`, a structured error with `status`, or a bare message.
 * Parse with {@link cloudFailureSchema} right in the `catch`.
 */
export interface CloudFailure {
  code?: string;
  status?: string;
  message?: string;
  /** Cause kept by a wrapping structured error. */
  why?: string;
}

const codeSchema = z.union([z.string(), z.number()]).transform(String);

const failureObjectSchema = z.object({
  code: codeSchema.optional(),
  status: z.string().optional(),
  message: z.string().optional(),
  why: z.string().optional(),
});

/**
 * Parses a thrown value into a {@link CloudFailure}. Never throws: a thrown
 * string becomes `message`, anything else becomes an empty failure.
 */
export const cloudFailureSchema: z.ZodType<CloudFailure> = z.union([
  failureObjectSchema,
  z.string().transform((message) => ({ message })),
  z.unknown().transform(() => ({})),
]);

/** Google Play services status code for a failed network call. */
const GOOGLE_NETWORK_ERROR = "7";
/** `react-native-cloud-storage` code for a failed network call. */
const CLOUD_NETWORK_ERROR = "ERR_NETWORK_ERROR";

/**
 * Whether a failure means "no internet", not a broken setup. Offline failures
 * pause backup and never reach Sentry.
 */
export const isOfflineFailure = (failure: CloudFailure): boolean =>
  failure.status === OFFLINE_STATUS ||
  failure.code === GOOGLE_NETWORK_ERROR ||
  failure.code === CLOUD_NETWORK_ERROR ||
  /network|offline|internet|unreachable|timed out/iu.test(
    failure.message ?? ""
  );

/**
 * `react-native-cloud-storage` code when Google Drive rejects the token:
 * access revoked in the Google account, or the token expired for good.
 */
export const DRIVE_SIGN_IN_REJECTED = "ERR_AUTHENTICATION_FAILED";

/**
 * Error for a failed cloud call: `backup_offline` without internet,
 * `backup_signed_out` for a rejected Google token, else the given status.
 * Every cloud call throws through this, so callers see one error shape.
 */
export const createCloudError = (
  failure: CloudFailure,
  status: string,
  message: string
) => {
  const why = failure.message ?? "The cloud call failed without a message";
  if (isOfflineFailure(failure)) {
    return createStructuredError({
      status: OFFLINE_STATUS,
      message: "No connection to the cloud",
      why,
      fix: "Pixy retries when the phone is online again.",
    });
  }
  if (failure.code === DRIVE_SIGN_IN_REJECTED) {
    return Object.assign(
      createStructuredError({
        status: SIGNED_OUT_STATUS,
        message: "Google Drive rejected the sign-in",
        why: failure.message ?? "Access was revoked or the token expired",
        fix: "Sign in to Google Drive again from Settings > Data > Backup.",
      }),
      { code: failure.code }
    );
  }
  // Keep the library code: callers and Sentry need the original cause.
  return Object.assign(
    createStructuredError({
      status,
      message,
      why,
      fix: "Check the internet connection and iCloud or Google Drive settings. Pixy retries on the next change.",
    }),
    { code: failure.code }
  );
};
