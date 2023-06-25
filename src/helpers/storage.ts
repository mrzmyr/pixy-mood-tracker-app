import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Sentry from 'sentry-expo';

export const store = async <State>(key: string, state: State) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(state));
  } catch (e) {
    console.error(e);
  }
}

export const load = async <ReturnValue>(key: string, feedback: any): Promise<ReturnValue | null> => {
  try {
    const data = await AsyncStorage.getItem(key);
    if (!data) {
      return null;
    }
    return JSON.parse(data);
  } catch (error) {
    console.error(error);
    feedback
      .send({
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
    Sentry.Native.captureException(error);
  }

  return null
};
