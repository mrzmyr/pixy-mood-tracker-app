import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Sentry from '@sentry/react-native';

type StorageError = Error & {
  status: string;
  why: string;
  fix: string;
};

const createStorageError = (
  status: string,
  message: string,
  why: string,
  fix: string,
): StorageError =>
  Object.assign(new Error(message), {
    status,
    why,
    fix,
  });

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const captureStorageError = (error: StorageError, key: string) => {
  console.error(error);
  try {
    Sentry.captureException(error);
  } catch (captureError) {
    console.error(createStorageError(
      "storage_telemetry_failed",
      "Storage error reporting failed",
      `Sentry failed while reporting storage key "${key}": ${errorMessage(captureError)}`,
      "Check the Sentry SDK configuration",
    ));
  }
};

export const store = async <State>(key: string, state: State) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(state));
  } catch (error) {
    captureStorageError(createStorageError(
      "storage_write_failed",
      "Stored data could not be saved",
      `Writing storage key "${key}" failed: ${errorMessage(error)}`,
      "Retry the operation and check available device storage",
    ), key);
  }
}

const createInvalidStoredValueError = (
  key: string,
  why: string,
): StorageError =>
  createStorageError(
    "storage_invalid_value",
    "Stored data is invalid",
    `Storage key "${key}" ${why}`,
    "Restore valid JSON data or remove the corrupted storage entry",
  );

const reportLoadError = (error: StorageError, key: string, feedback?: any) => {
  console.error(error);
  try {
    feedback?.send({
      type: "issue",
      message: JSON.stringify({
        title: `Error loading storage key ${key}`,
        description: error.message,
        trace: error.stack,
      }),
      email: "team@pixy.day",
      source: "error",
      onCancel: () => {
      },
      onOk: () => {
      }
    })
  } catch (feedbackError) {
    console.error(createStorageError(
      "storage_feedback_failed",
      "Storage feedback could not be sent",
      `Feedback failed for storage key "${key}": ${errorMessage(feedbackError)}`,
      "Retry later and check the feedback service configuration",
    ));
  }
  try {
    Sentry.captureException(error);
  } catch (captureError) {
    console.error(createStorageError(
      "storage_telemetry_failed",
      "Storage error reporting failed",
      `Sentry failed while reporting storage key "${key}": ${errorMessage(captureError)}`,
      "Check the Sentry SDK configuration",
    ));
  }
}

// Returns `null` only when no data exists for `key`. Read or parse failures
// throw, so callers can tell "no data yet" apart from "data exists but could
// not be loaded" — treating a failed load as empty state must never overwrite
// the stored data.
export const load = async <ReturnValue>(key: string, feedback?: any): Promise<ReturnValue | null> => {
  let data: string | null;

  try {
    data = await AsyncStorage.getItem(key);
  } catch (error) {
    const storageError = createStorageError(
      "storage_read_failed",
      "Stored data could not be read",
      `Reading storage key "${key}" failed: ${errorMessage(error)}`,
      "Retry the operation and check device storage access",
    );
    reportLoadError(storageError, key, feedback);
    throw storageError;
  }

  // Only a missing key counts as "no data" — an empty string is
  // persisted-but-corrupt data and must fall through to JSON.parse below,
  // which throws and keeps callers from overwriting the stored value.
  if (data == null) {
    return null;
  }

  try {
    const parsed = JSON.parse(data);
    if (parsed === null) {
      throw createInvalidStoredValueError(key, "contains JSON null");
    }
    return parsed;
  } catch (error) {
    const storageError =
      error instanceof Error &&
      "status" in error &&
      "why" in error &&
      "fix" in error
        ? error as StorageError
        : createInvalidStoredValueError(
          key,
          `could not be parsed: ${errorMessage(error)}`,
        );
    reportLoadError(storageError, key, feedback);
    throw storageError;
  }
};
