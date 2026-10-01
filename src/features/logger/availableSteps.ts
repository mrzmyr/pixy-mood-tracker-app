import type { LogItem } from "@/features/logs";
import type { IQuestion } from "@/features/questioner";
import type { useSettings } from "@/state/settings";
import type { LoggerStep } from "./config";

type HasStep = ReturnType<typeof useSettings>["hasStep"];

/**
 * Slides for a new entry, from the user's enabled steps. The reminder slide
 * shows only for the first entry while reminders are off; the feedback slide
 * needs 3+ entries and a question.
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
  if (hasStep("photos")) {
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
 * Slides for an existing entry. A disabled step still shows when the entry
 * has content for it, so the user can always change saved content.
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
  if (hasStep("message") || item.message.length > 0) {
    slides.push("message");
  }
  if (hasStep("photos") || item.photos.length > 0) {
    slides.push("photos");
  }

  return slides;
};
