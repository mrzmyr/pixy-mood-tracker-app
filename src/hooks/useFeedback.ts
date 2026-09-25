import * as Localization from "expo-localization";
import { Alert, Platform } from "react-native";
import { FEEDBACK_URL } from "@/constants/API";
import { serviceFetch } from "@/lib/serviceFetch";
import { t } from "@/helpers/translation";
import pkg from "../../package.json";
import { useAnalytics } from "./useAnalytics";
import { useSettings } from "./useSettings";
import * as Updates from "expo-updates";

/**
 * Feedback category sent with the report; also selects the modal's type tab.
 */
export type FeedackType = "issue" | "idea" | "other" | "emoji" | "custom";
/** Where in the app the feedback was sent from; used for triage only. */
export type FeedbackSource = "tags" | "modal" | "statistics" | "error";

/**
 * Send feedback with device metadata (locale, app version, OS, device id)
 * to {@link FEEDBACK_URL}.
 *
 * Without `onOk`/`onCancel`, `send` shows a success or error alert itself.
 * Network and HTTP errors never reject.
 */
export const useFeedback = () => {
  const { settings } = useSettings();
  const analytics = useAnalytics();

  const send = async ({
    type,
    message,
    email,
    source,
    onOk,
    onCancel,
  }: {
    type: FeedackType;
    source: FeedbackSource;
    email?: string;
    message: string;
    onOk?: () => void;
    onCancel?: () => void;
  }) => {
    const metaData = {
      locale: Localization.getLocales()[0]?.languageTag,
      version: pkg.version,
      os: Platform.OS,
      date: new Date().toISOString(),
      source,
      deviceId: settings.deviceId,
      environment: Updates.channel,
    };

    const body = {
      ...metaData,
      type,
      message,
      email,
    };

    analytics.track("feedback_send", body);

    try {
      const resp = await serviceFetch(FEEDBACK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (resp.ok) {
        if (onOk) {
          onOk();
        } else {
          Alert.alert(
            t("feedback_success_title"),
            t("feedback_success_message"),
            [{ text: t("ok") }],
            { cancelable: false }
          );
        }
      } else if (onCancel) {
        onCancel();
      } else {
        Alert.alert(
          t("feedback_error_title"),
          t("feedback_error_message"),
          [{ text: t("ok") }],
          { cancelable: false }
        );
      }
    } catch {
      if (onCancel) {
        onCancel();
      } else {
        Alert.alert(
          t("feedback_error_title"),
          t("feedback_error_message"),
          [{ text: t("ok") }],
          { cancelable: false }
        );
      }
    }
  };

  return {
    send,
  };
};
