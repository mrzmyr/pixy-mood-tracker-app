import { IS_PHOTOS_ENABLED } from "@/constants/FeatureFlags";
import type { LoggerStep } from "@/constants/LoggerSteps";
import type { LogItem } from "@/features/logs";
import type { IQuestion } from "@/features/questioner";
import type { useSettings } from "@/state/settings";

/**
 * Steps of the create logger: enabled optional steps, plus the reminder
 * slide on the first entry while reminders are off, and the feedback slide
 * from the third entry when a question is available. `photos` needs
 * `IS_PHOTOS_ENABLED`.
 */
export const getAvailableStepsForCreate = ({
  question,
  hasStep,
  reminderEnabled,
  itemsCount,
}: {
  question: IQuestion | null;
  hasStep: ReturnType<typeof useSettings>["hasStep"];
  reminderEnabled: boolean;
  itemsCount: number;
}) => {
  const slides: LoggerStep[] = ["rating"];

  if (hasStep("emotions")) {
    slides.push("emotions");
  }
  if (hasStep("tags")) {
    slides.push("tags");
  }
  if (hasStep("message")) {
    slides.push("message");
  }
  if (IS_PHOTOS_ENABLED && hasStep("photos")) {
    slides.push("photos");
  }

  if (itemsCount === 1 && !reminderEnabled) {
    slides.push("reminder");
  }

  if (itemsCount >= 3 && question !== null && hasStep("feedback")) {
    slides.push("feedback");
  }

  return slides;
};

/**
 * Steps of the edit logger: enabled optional steps, plus every step that
 * holds content on the entry. `photos` needs `IS_PHOTOS_ENABLED`.
 */
export const getAvailableStepsForEdit = ({
  item,
  hasStep,
}: {
  item: LogItem;
  hasStep: ReturnType<typeof useSettings>["hasStep"];
}) => {
  const slides: LoggerStep[] = ["rating"];

  if (hasStep("emotions") || item.emotions.length > 0) {
    slides.push("emotions");
  }
  if (hasStep("tags") || item.tags.length > 0) {
    slides.push("tags");
  }
  if (hasStep("message") || item.message.length > 0) {
    slides.push("message");
  }
  if (IS_PHOTOS_ENABLED && (hasStep("photos") || item.photos.length > 0)) {
    slides.push("photos");
  }

  return slides;
};
