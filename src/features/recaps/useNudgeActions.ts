import dayjs from "dayjs";
import { useRouter } from "expo-router";
import { Linking } from "react-native";
import { reminderTimeToDate, useReminder } from "@/features/notifications";
import { useStepEnabled } from "@/features/settings";
import { t } from "@/lib/translation";
import { showToast } from "@/lib/toast";
import { useAnalytics } from "@/state/analytics";
import { getCardProperties } from "./analytics";
import { THRESHOLDS } from "./thresholds";
import type { CardType, Period, RecapCard } from "./types";

const turnOnStep = (setEnabled: (next: boolean) => void) => {
  setEnabled(true);
  showToast({ title: t("recaps_step_turned_on") });
};

/**
 * Turn On and Not Now of nudge cards. Turn On changes the real setting
 * through the same hooks as Settings, so their events fire too.
 */
export const useNudgeActions = (period: Period) => {
  const analytics = useAnalytics();
  const router = useRouter();
  const reminder = useReminder();
  const emotions = useStepEnabled("emotions");
  const people = useStepEnabled("people");
  const photos = useStepEnabled("photos");

  const track = (card: RecapCard, action: "turn_on" | "not_now") => {
    analytics.track("recaps:nudge_tapped", {
      ...getCardProperties(card, period),
      action,
    });
  };

  const enableReminder = async () => {
    const result = await reminder.enable(THRESHOLDS.reminderTime);
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

  const turnOnActions: Record<CardType, () => void> = {
    "nudge-reminder": () => {
      void enableReminder();
    },
    "intro-emotions": () => turnOnStep(emotions.setEnabled),
    "intro-people": () => turnOnStep(people.setEnabled),
    "intro-photos": () => turnOnStep(photos.setEnabled),
    "intro-categories": () => router.push("/tags/categories"),
  };

  return {
    turnOn: (card: RecapCard) => {
      track(card, "turn_on");
      turnOnActions[card.type]();
    },
    notNow: (card: RecapCard) => track(card, "not_now"),
  };
};
