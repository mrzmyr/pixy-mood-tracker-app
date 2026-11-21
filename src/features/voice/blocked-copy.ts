import { t } from "@/lib/translation";
import type { VoiceErrorStatus, VoiceStatus } from "./use-voice-transcription";

/** Title and body for denied permission or a failed recognizer. */
export const blockedCopy = (
  status: VoiceStatus,
  errorStatus: VoiceErrorStatus | undefined
) => {
  if (status === "denied") {
    return {
      title: t("voice_permission_title"),
      body: t("voice_permission_body"),
    };
  }
  if (errorStatus === "voice_siri_disabled") {
    return { title: t("voice_failed_title"), body: t("voice_failed_siri") };
  }
  const isLanguageMissing =
    errorStatus === "voice_on_device_unavailable" ||
    errorStatus === "voice_recognizer_unavailable";
  return {
    title: t("voice_failed_title"),
    body: isLanguageMissing
      ? t("voice_failed_language")
      : t("voice_failed_body"),
  };
};
