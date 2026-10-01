import type { LogItem } from "@/features/logs";
import type { IQuestion } from "@/features/questioner";
import type { useSettings } from "@/state/settings";
import type { LoggerStep } from "./config";

type HasStep = ReturnType<typeof useSettings>["hasStep"];

/**
 * Slides for a new entry. The reminder slide shows only when exactly one
 * entry exists and reminders are off; the feedback slide needs 3+ entries
 * and an available question.
 */
export const getAvailableStepsForCreate = ({
  question,
  hasStep,
  reminderEnabled,
  itemsCount,
}: {
  question: IQuestion | null;
  hasStep: HasStep;
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

  if (itemsCount === 1 && !reminderEnabled) {
    slides.push("reminder");
  }

  if (itemsCount >= 3 && question !== null && hasStep("feedback")) {
    slides.push("feedback");
  }

  return slides;
};

/**
 * Slides for an existing entry. A disabled step still shows when the entry
 * has content for it. Photos live on the message slide, so the message
 * slide also shows when the entry has photos.
 */
export const getAvailableStepsForEdit = ({
  item,
  hasStep,
}: {
  item: LogItem;
  hasStep: HasStep;
}) => {
  const slides: LoggerStep[] = ["rating"];

  if (hasStep("emotions") || item.emotions.length > 0) {
    slides.push("emotions");
  }
  if (hasStep("tags") || item.tags.length > 0) {
    slides.push("tags");
  }
  if (hasStep("message") || item.message.length > 0 || item.photos.length > 0) {
    slides.push("message");
  }

  return slides;
};
