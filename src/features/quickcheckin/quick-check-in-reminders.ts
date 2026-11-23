import { useEffect } from "react";
import { defaultQuickCheckInScheduler } from "@/features/notifications";
import type { QuickCheckInNotificationScheduler } from "@/features/notifications";
import { createStructuredError } from "@/lib/errors";
import { reportError } from "@/lib/report-error";

const reportCancelError = (cause: unknown) => {
  const error = createStructuredError({
    status: "quick_check_in_cancel_failed",
    message: "Quick check-in notifications could not be canceled",
    why: `expo-notifications failed: ${cause instanceof Error ? cause.message : String(cause)}`,
    fix: "Open Pixy again",
  });
  console.error(error);
  reportError(error);
};

/**
 * Cancels the quick check-in notifications that older app versions
 * scheduled every few hours. Runs once per launch.
 */
export const useCancelQuickCheckInNotifications = (
  scheduler: QuickCheckInNotificationScheduler = defaultQuickCheckInScheduler
) => {
  useEffect(() => {
    scheduler.cancelAll().catch(reportCancelError);
  }, [scheduler]);
};
