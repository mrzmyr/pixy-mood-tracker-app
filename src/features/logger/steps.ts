import type { LoggerStep } from "@/constants/LoggerSteps";
import type { LogItem } from "@/features/logs";
import type { IQuestion } from "@/features/questioner";
import type { useSettings } from "@/state/settings";

/**
 * Steps of the create logger: enabled optional steps, plus the reminder
 * slide on the first entry while reminders are off, and the feedback slide
 * from the third entry when a question is available. `people` needs the
 * `people` feature flag, `photos` the `photos` feature flag.
 */
export const getAvailableStepsForCreate = ({
  question,
  hasStep,
  reminderEnabled,
  itemsCount,
  hasPeople,
  isPhotosEnabled,
}: {
  question: IQuestion | null;
  hasStep: ReturnType<typeof useSettings>["hasStep"];
  reminderEnabled: boolean;
  itemsCount: number;
  /** The `people` feature flag; off hides the slide even with the step on. */
  hasPeople: boolean;
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
  if (hasPeople && hasStep("people")) {
    slides.push("people");
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
 * holds content on the entry. Entries with people keep the `people` step,
 * also without the `people` flag. `photos` needs the `photos` feature flag,
 * also when the entry has photos: the day view still shows them.
 */
export const getAvailableStepsForEdit = ({
  item,
  hasStep,
  hasPeople,
  isPhotosEnabled,
}: {
  item: LogItem;
  hasStep: ReturnType<typeof useSettings>["hasStep"];
  /** The `people` feature flag. */
  hasPeople: boolean;
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
  if ((hasPeople && hasStep("people")) || item.people.length > 0) {
    slides.push("people");
  }
  if (hasStep("message") || item.message.length > 0) {
    slides.push("message");
  }
  if (isPhotosEnabled && (hasStep("photos") || item.photos.length > 0)) {
    slides.push("photos");
  }

  return slides;
};

/**
 * Floating button on the rating slide. Hidden on a fresh create logger until
 * the user moves the carousel. With rating as the only slide, the button
 * saves, so it shows `save`; otherwise it shows `next`.
 */
export const getRatingActionType = ({
  slideCount,
  slideIndex,
  isTouched,
  mode,
}: {
  slideCount: number;
  slideIndex: number;
  isTouched: boolean;
  mode: "create" | "edit";
}): "next" | "save" | "hidden" => {
  const isVisible = slideIndex !== 0 || isTouched || mode === "edit";
  if (!isVisible) {
    return "hidden";
  }
  return slideCount === 1 ? "save" : "next";
};
