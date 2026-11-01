import { reportError } from "@/lib/report-error";
import dayjs from "dayjs";
import { Linking } from "react-native";
import { reminderTimeToDate, useReminder } from "@/features/notifications";
import { useStepEnabled } from "@/features/settings";
import { createStructuredError } from "@/lib/errors";
import { t } from "@/lib/translation";
import { showToast } from "@/lib/toast";
import { useAnalytics } from "@/state/analytics";
import { getCardProperties } from "./analytics";
import type { NudgeCard, Period } from "./types";

const turnOnStep = (setEnabled: (next: boolean) => void) => {
  setEnabled(true);
  showToast({ title: t("recaps_step_turned_on") });
};

const reportReminderError = (cause: unknown) => {
  const error = createStructuredError({
    status: "recap_reminder_enable_failed",
    message: "Reminder could not be turned on from a recap card",
    why: `useReminder().enable failed: ${cause instanceof Error ? cause.message : String(cause)}`,
    fix: "Turn the reminder on in Settings > Reminder",
  });
  console.error(error);
  reportError(error);
};

/**
 * Turn On and Not Now of nudge cards. Turn On changes the real setting
 * through the same hooks as Settings, so their events fire too. The
 * reminder starts at the time the user saved before.
 */
export const useNudgeActions = (period: Period) => {
  const analytics = useAnalytics();
  const reminder = useReminder();
  const emotions = useStepEnabled("emotions");
  const people = useStepEnabled("people");
  const photos = useStepEnabled("photos");

  const track = (card: NudgeCard, action: "turn_on" | "not_now") => {
    analytics.track("recaps:nudge_tapped", {
      ...getCardProperties(card, period),
      action,
    });
  };

  const enableReminder = async () => {
    let result: Awaited<ReturnType<typeof reminder.enable>>;
    try {
      result = await reminder.enable(reminder.time);
    } catch (cause) {
      reportReminderError(cause);
      showToast({ title: t("recaps_reminder_failed") });
      return;
    }
    analytics.track("reminders:reminder_toggled", {
      enabled: true,
      permission_granted: result.status === "enabled",
    });
    if (result.status === "permission_denied") {
      showToast({
        title: t("reminder_permission_denied"),
        action: {
          label: t("recaps_open_settings"),
          onPress: () => {
            void Linking.openSettings();
          },
        },
      });
      return;
    }
    showToast({
      title: t("recaps_reminder_set", {
        time: dayjs(reminderTimeToDate(result.time)).format("LT"),
      }),
    });
  };

  const turnOnActions: Record<NudgeCard["type"], () => Promise<void> | void> = {
    "nudge-reminder": enableReminder,
    "intro-emotions": () => turnOnStep(emotions.setEnabled),
    "intro-people": () => turnOnStep(people.setEnabled),
    "intro-photos": () => turnOnStep(photos.setEnabled),
  };

  return {
    reminderTime: reminder.time,
    turnOn: async (card: NudgeCard) => {
      track(card, "turn_on");
      await turnOnActions[card.type]();
    },
    notNow: (card: NudgeCard) => track(card, "not_now"),
  };
};
