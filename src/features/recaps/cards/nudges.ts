import dayjs from "dayjs";
import type { ConfigurableLoggerStep } from "@/constants/LoggerSteps";
import { GENERAL_CATEGORY_ID } from "@/features/tags";
import type { Tag } from "@/features/tags";
import { THRESHOLDS } from "../thresholds";
import type { RecapCard, RecapInput } from "../types";

/** Days of the period from today on that have no entry yet. */
const openDays = ({ period, today, days }: RecapInput) => {
  const logged = new Set(days.map((day) => day.date));
  let count = 0;
  for (
    let day = dayjs(today > period.start ? today : period.start);
    day.format("YYYY-MM-DD") <= period.end;
    day = day.add(1, "day")
  ) {
    if (!logged.has(day.format("YYYY-MM-DD"))) {
      count += 1;
    }
  }
  return count;
};

/**
 * Reminder off, and the week can no longer reach 5 check-in days: days with
 * an entry plus open days ahead stay below 5.
 */
export const nudgeReminder = (input: RecapInput): RecapCard | null =>
  !input.reminderEnabled &&
  input.days.length + openDays(input) < THRESHOLDS.reminderMaxCheckInDays
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

/** Tags the check-in offers: archived tags stay out. */
export const getActiveTags = (tags: Tag[]) =>
  tags.filter((tag) => !tag.isArchived);

/** Many tags, none of them in a category of the user's own. */
export const introCategories = (input: RecapInput): RecapCard | null => {
  if (!input.steps.has("tags")) {
    return null;
  }
  const activeTags = getActiveTags(input.tags);
  const allGeneral = activeTags.every(
    (tag) => (tag.categoryId ?? GENERAL_CATEGORY_ID) === GENERAL_CATEGORY_ID
  );
  return allGeneral && activeTags.length >= THRESHOLDS.categoriesMinTags
    ? { type: "intro-categories", tagsCount: activeTags.length }
    : null;
};
