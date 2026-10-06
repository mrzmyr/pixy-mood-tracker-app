import { z } from "zod";

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
