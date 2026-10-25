import AsyncStorage from "@react-native-async-storage/async-storage";
import { reportError } from "@/lib/report-error";
import { z } from "zod";
import { createStructuredError } from "@/lib/errors";
import { load, store } from "@/state/persisted";
import type { LogItemSchema } from "@/types";

/**
 * Snapshot of an open logger, written when the app goes to the background
 * and removed when it comes back. A snapshot found at launch means the OS
 * killed the app while the logger was open.
 */
export const LOGGER_RECOVERY_KEY = "PIXEL_TRACKER_LOGGER_RECOVERY";

// Structural check only: the app wrote the snapshot from its own draft, and
// legacy entries can miss the strict entry schema (for example non-UUID ids).
const LoggerRecoverySchema = z.object({
  version: z.literal(1),
  mode: z.enum(["create", "edit"]),
  /** Slide the logger showed. Unknown steps open the first slide. */
  step: z.string(),
  /** ISO time the snapshot was written. */
  savedAt: z.string(),
  draft: z.looseObject({
    id: z.string(),
    date: z.string(),
    dateTime: z.string(),
    message: z.string(),
    tags: z.array(z.unknown()),
    people: z.array(z.unknown()),
    emotions: z.array(z.unknown()),
    photos: z.array(z.looseObject({ fileName: z.string() })),
  }),
});

type LogItem = z.infer<typeof LogItemSchema>;

/** Open logger at the moment the app went to the background. */
export interface LoggerRecovery {
  version: 1;
  mode: "create" | "edit";
  step: string;
  savedAt: string;
  /** Logger draft: an entry whose rating and sleep quality can be `null`. */
  draft: Omit<LogItem, "rating" | "sleep"> & {
    rating: LogItem["rating"] | null;
    sleep: { quality: LogItem["sleep"]["quality"] | null };
  };
}

// Loose shape for the photo sweep: keeps photo files even when the rest of
// the snapshot fails validation.
const RecoveryPhotosSchema = z.object({
  draft: z.object({
    photos: z.array(z.object({ fileName: z.string() })),
  }),
});

const errorMessage = (cause: unknown) =>
  cause instanceof Error ? cause.message : String(cause);

/** Write the snapshot. Never rejects: failures go to `reportError`. */
export const saveLoggerRecovery = (recovery: LoggerRecovery) =>
  store(LOGGER_RECOVERY_KEY, recovery);

/**
 * Read the snapshot. Resolves `null` when none exists.
 *
 * Rejects with a structured error when the read fails or the stored value
 * is invalid (`logger_recovery_invalid`). The stored value stays: callers
 * must not clear it after a failed read.
 */
export const loadLoggerRecovery = async (): Promise<LoggerRecovery | null> => {
  const stored = await load<unknown>(LOGGER_RECOVERY_KEY);
  if (stored === null) {
    return null;
  }
  const parsed = LoggerRecoverySchema.safeParse(stored);
  if (!parsed.success) {
    throw createStructuredError({
      status: "logger_recovery_invalid",
      message: "Logger recovery snapshot is invalid",
      why: `Stored snapshot failed validation at ${parsed.error.issues
        .map((issue) => issue.path.join("."))
        .join(", ")}`,
      fix: "No action needed; the app skips the resume prompt",
    });
  }
  // SAFETY: the app writes this key only from a logger draft; the schema above checks the fields recovery reads.
  return parsed.data as LoggerRecovery;
};

/** Remove the snapshot. Never rejects: failures go to `reportError`. */
export const clearLoggerRecovery = async () => {
  try {
    await AsyncStorage.removeItem(LOGGER_RECOVERY_KEY);
  } catch (error) {
    const clearError = createStructuredError({
      status: "logger_recovery_clear_failed",
      message: "Logger recovery snapshot could not be removed",
      why: `Removing storage key "${LOGGER_RECOVERY_KEY}" failed: ${errorMessage(error)}`,
      fix: "No action needed; the next launch may offer the entry again",
    });
    console.error(clearError);
    reportError(clearError);
  }
};

/**
 * Photo file names the snapshot references, so the photo sweep keeps them.
 * Resolves `null` when the snapshot cannot be read: the sweep must then
 * keep every file.
 */
export const loadRecoveryPhotoFileNames = async (): Promise<
  string[] | null
> => {
  let stored: unknown;
  try {
    stored = await load<unknown>(LOGGER_RECOVERY_KEY);
  } catch {
    // `load` already reported the error.
    return null;
  }
  if (stored === null) {
    return [];
  }
  const parsed = RecoveryPhotosSchema.safeParse(stored);
  return parsed.success
    ? parsed.data.draft.photos.map((photo) => photo.fileName)
    : null;
};
