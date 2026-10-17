import { showToast } from "@/lib/toast";
import { t } from "@/lib/translation";

/** Long enough to read the fix and reach Retry on both platforms. */
const SAVE_FAILED_MS = 8000;

/**
 * Tells the user a save did not reach storage. The form stays open with its
 * input; Retry runs `onRetry`. The storage error is already reported.
 */
export const showSaveFailed = (onRetry: () => void) => {
  showToast({
    title: t("save_failed_title"),
    message: t("save_failed_message"),
    action: { label: t("save_failed_retry"), onPress: onRetry },
    durationMs: SAVE_FAILED_MS,
  });
};
