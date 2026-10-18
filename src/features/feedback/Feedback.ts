import * as Localization from "expo-localization";
import { Alert, Platform } from "react-native";
import { FEEDBACK_URL } from "@/constants/API";
import { APP_VARIANT, HAS_APP_VARIANT } from "@/constants/AppVariant";
import { createStructuredError } from "@/lib/errors";
import type { StructuredError } from "@/lib/errors";
import { t } from "@/lib/translation";
import pkg from "../../../package.json";
import { useAnalytics } from "@/state/analytics";
import { useSetting } from "@/state/settings";
import type { FeedackType, FeedbackSource } from "@/types/Feedback";

export type { FeedackType, FeedbackSource } from "@/types/Feedback";

/**
 * Send feedback with device metadata (locale, app version, OS, device id)
 * to {@link FEEDBACK_URL}.
 *
 * Without `onOk`/`onCancel`, `send` shows a success or error alert itself.
 * Network and HTTP errors never reject: `onCancel` gets them as
 * {@link StructuredError}.
 */
export const useFeedback = () => {
  const deviceId = useSetting("deviceId");
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
    onCancel?: (error: StructuredError) => void;
  }) => {
    const metaData = {
      locale: Localization.getLocales()[0]?.languageTag,
      version: pkg.version,
      os: Platform.OS,
      date: new Date().toISOString(),
      source,
      deviceId,
      environment: HAS_APP_VARIANT ? APP_VARIANT : undefined,
    };

    const body = {
      ...metaData,
      type,
      message,
      email,
    };

    analytics.track("feedback:feedback_submitted", {
      type,
      source,
      message_length: message.length,
      has_email: Boolean(email),
    });

    try {
      const resp = await fetch(FEEDBACK_URL, {
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
      } else {
        analytics.track("feedback:submit_failed", {
          http_status: resp.status,
        });
        if (onCancel) {
          onCancel(
            createStructuredError({
              status: resp.status,
              message: "Feedback could not be sent",
              why: `Feedback endpoint answered HTTP ${resp.status}`,
              fix: "Check the connection, then send again",
            })
          );
        } else {
          Alert.alert(
            t("feedback_error_title"),
            t("feedback_error_message"),
            [{ text: t("ok") }],
            { cancelable: false }
          );
        }
      }
    } catch (error) {
      analytics.track("feedback:submit_failed", { http_status: null });
      if (onCancel) {
        onCancel(
          createStructuredError({
            status: "feedback_network_error",
            message: "Feedback could not be sent",
            why: error instanceof Error ? error.message : String(error),
            fix: "Check the connection, then send again",
          })
        );
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
