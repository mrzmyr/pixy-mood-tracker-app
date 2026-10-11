import type { ConfigurableLoggerStep } from "@/constants/LoggerSteps";
import { GENERAL_CATEGORY_ID } from "@/features/tags";
import { THRESHOLDS } from "../thresholds";
import type { RecapCard, RecapInput } from "../types";

/** Fewer than 5 check-in days in the week, and no reminder yet. */
export const nudgeReminder = ({
  days,
  reminderEnabled,
}: RecapInput): RecapCard | null =>
  !reminderEnabled && days.length < THRESHOLDS.reminderMaxCheckInDays
    ? { type: "nudge-reminder" }
    : null;

const isOff = (
  { steps, availableSteps }: RecapInput,
  step: ConfigurableLoggerStep
) => availableSteps.has(step) && !steps.has(step);

/** Emotions step off, but available. */
export const introEmotions = (input: RecapInput): RecapCard | null =>
  isOff(input, "emotions") ? { type: "intro-emotions" } : null;

/** People step off, but available: needs flag `people`. */
export const introPeople = (input: RecapInput): RecapCard | null =>
  isOff(input, "people") ? { type: "intro-people" } : null;

/** Photos step off, but available: needs flag `photos`. */
export const introPhotos = (input: RecapInput): RecapCard | null =>
  isOff(input, "photos") ? { type: "intro-photos" } : null;

/** Many tags, none of them in a category of the user's own. */
export const introCategories = (input: RecapInput): RecapCard | null => {
  if (!input.steps.has("tags")) {
    return null;
  }
  const activeTags = input.tags.filter((tag) => !tag.isArchived);
  const allGeneral = activeTags.every(
    (tag) => (tag.categoryId ?? GENERAL_CATEGORY_ID) === GENERAL_CATEGORY_ID
  );
  return allGeneral && activeTags.length >= THRESHOLDS.categoriesMinTags
    ? { type: "intro-categories", tagsCount: activeTags.length }
    : null;
};
