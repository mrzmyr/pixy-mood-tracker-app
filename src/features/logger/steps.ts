import type { LoggerStep } from "@/constants/LoggerSteps";
import type { LogItem } from "@/features/logs";
import type { IQuestion } from "@/features/questioner";
import type { useSettings } from "@/state/settings";

/**
 * Steps of the create logger: enabled optional steps, plus the reminder
 * slide on the first entry while reminders are off, and the feedback slide
 * from the third entry when a question is available. `photos` needs the
 * `photos` feature flag.
 */
export const getAvailableStepsForCreate = ({
  question,
  hasStep,
  reminderEnabled,
  itemsCount,
  isPhotosEnabled,
}: {
  question: IQuestion | null;
  hasStep: ReturnType<typeof useSettings>["hasStep"];
  reminderEnabled: boolean;
  itemsCount: number;
  /** Value of the `photos` feature flag. */
  isPhotosEnabled: boolean;
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
  if (isPhotosEnabled && hasStep("photos")) {
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
 * holds content on the entry. `photos` needs the `photos` feature flag,
 * also when the entry has photos: the day view still shows them.
 */
export const getAvailableStepsForEdit = ({
  item,
  hasStep,
  isPhotosEnabled,
}: {
  item: LogItem;
  hasStep: ReturnType<typeof useSettings>["hasStep"];
  /** Value of the `photos` feature flag. */
  isPhotosEnabled: boolean;
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
  if (isPhotosEnabled && (hasStep("photos") || item.photos.length > 0)) {
    slides.push("photos");
  }

  return slides;
};
