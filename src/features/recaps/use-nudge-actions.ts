import { useStepEnabled } from "@/features/settings";
import { t } from "@/lib/translation";
import { showToast } from "@/lib/toast";
import { useAnalytics } from "@/state/analytics";
import { getCardProperties } from "./analytics";
import type { NudgeCard, Period } from "./types";

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
  const emotions = useStepEnabled("emotions");
  const people = useStepEnabled("people");
  const photos = useStepEnabled("photos");

  const track = (card: NudgeCard, action: "turn_on" | "not_now") => {
    analytics.track("recaps:nudge_tapped", {
      ...getCardProperties(card, period),
      action,
    });
  };

  const turnOnActions: Record<NudgeCard["type"], () => Promise<void> | void> = {
    "intro-emotions": () => turnOnStep(emotions.setEnabled),
    "intro-people": () => turnOnStep(people.setEnabled),
    "intro-photos": () => turnOnStep(photos.setEnabled),
  };

  return {
    turnOn: async (card: NudgeCard) => {
      track(card, "turn_on");
      await turnOnActions[card.type]();
    },
    notNow: (card: NudgeCard) => track(card, "not_now"),
  };
};
