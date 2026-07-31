import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Sentry from '@sentry/react-native';

export const store = async <State>(key: string, state: State) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(state));
  } catch (e) {
    console.error(e);
  }
}

const reportLoadError = (error: any, feedback?: any) => {
  console.error(error);
  try {
    feedback?.send({
      type: "issue",
      message: JSON.stringify({
        title: "Error loading logs",
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
  } catch (e) {
    console.error(e);
  }
  Sentry.captureException(error);
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
    reportLoadError(error, feedback);
    throw error;
  }

  // Only a missing key counts as "no data" — an empty string is
  // persisted-but-corrupt data and must fall through to JSON.parse below,
  // which throws and keeps callers from overwriting the stored value.
  if (data == null) {
    return null;
  }

  try {
    return JSON.parse(data);
  } catch (error) {
    reportLoadError(error, feedback);
    throw error;
  }
};
