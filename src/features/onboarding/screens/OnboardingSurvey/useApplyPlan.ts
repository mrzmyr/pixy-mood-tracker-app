import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import { TAG_COLOR_NAMES } from "@/constants/Config";
import { useLogState } from "@/features/logs";
import { createDailyTrigger, useNotification } from "@/features/notifications";
import { useTagsState, useTagsUpdater } from "@/features/tags";
import type { Tag } from "@/features/tags";
import { createStructuredError } from "@/lib/errors";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { useSettings } from "@/state/settings";
import type { SurveyPlan } from "./plan";
import { INFLUENCE_EMOJI } from "./survey";
import type { Influence } from "./survey";

/** Tag title for an influence, like the default tags: "Sleep 😴". */
export const getInfluenceTagTitle = (influence: Influence) =>
  `${t(`onboarding_survey_influences_${influence}`)} ${INFLUENCE_EMOJI[influence]}`;

/**
 * Apply a survey plan: daily reminder, logger steps, tags.
 *
 * Tags replace the default tags only while there are no entries yet, so no
 * entry loses a tag. Otherwise missing tags are added. The reminder needs
 * notification permission, asked during the survey; without it the reminder
 * stays off.
 */
export const useApplyPlan = () => {
  const { setSettings } = useSettings();
  const { tags } = useTagsState();
  const tagsUpdater = useTagsUpdater();
  const logState = useLogState();
  const notifications = useNotification();
  const analytics = useAnalytics();

  return async (plan: SurveyPlan, { canNotify }: { canNotify: boolean }) => {
    if (plan.steps) {
      const { steps } = plan;
      setSettings((settings) => ({ ...settings, steps }));
    }

    if (plan.tags.length > 0) {
      const created: Tag[] = plan.tags.map((influence, index) => ({
        id: uuidv4(),
        title: getInfluenceTagTitle(influence),
        color: TAG_COLOR_NAMES[index % TAG_COLOR_NAMES.length],
      }));
      if (logState.items.length === 0) {
        tagsUpdater.import({ tags: created });
      } else {
        const titles = new Set(tags.map((tag) => tag.title));
        for (const tag of created) {
          if (!titles.has(tag.title)) {
            tagsUpdater.createTag(tag);
          }
        }
      }
    }

    if (plan.reminderTime && canNotify) {
      const { reminderTime } = plan;
      const [hour, minute] = reminderTime.split(":").map(Number);
      try {
        await notifications.cancelAll();
        await notifications.schedule({
          trigger: createDailyTrigger(hour, minute),
        });
        setSettings((settings) => ({
          ...settings,
          reminderEnabled: true,
          reminderTime,
        }));
        analytics.track("onboarding:reminder_enabled");
      } catch (error) {
        // The plan still applies; the user can set the reminder in Settings.
        console.warn(
          createStructuredError({
            status: "onboarding_reminder_schedule_failed",
            message: "Daily reminder could not be scheduled",
            why: error instanceof Error ? error.message : String(error),
            fix: "Set the reminder in Settings › Reminder",
          })
        );
      }
    }
  };
};
