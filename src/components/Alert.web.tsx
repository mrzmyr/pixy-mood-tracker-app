import { createStructuredError } from "@/lib/errors";

export default {
  alert: (
    title: string,
    body: string,
    callbacks: [
      {
        text: string;
        onPress: () => void;
      },
      {
        text: string;
        onPress: () => void;
      },
    ]
  ) => {
    // Errors from callbacks reject the returned Promise instead of throwing
    // synchronously, matching the former Promise executor behavior.
    try {
      const message = `${title}: ${body}`;
      // oxlint-disable-next-line eslint/no-alert -- web shim for Alert.alert: react-native-web has no dialog API, so the browser confirm() is the platform equivalent.
      if (confirm(message)) {
        callbacks[0]?.onPress();
        return Promise.resolve({});
      }
      callbacks[1]?.onPress();
      return Promise.reject(
        createStructuredError({
          status: "alert_dismissed",
          message: "Alert dismissed",
          why: "The user declined the browser confirm dialog",
          fix: "No action needed; the user chose not to continue",
        })
      );
    } catch (error) {
      return Promise.reject(error);
    }
  },
};
