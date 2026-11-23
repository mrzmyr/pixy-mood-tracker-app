import type { ConfigurableLoggerStep } from "@/constants/logger-steps";
import type { Tag } from "@/features/tags";
import type { RecapCard, RecapInput } from "../types";

const isOff = ({ steps }: RecapInput, step: ConfigurableLoggerStep) =>
  !steps.has(step);

/** Emotions step off. */
export const introEmotions = (input: RecapInput): RecapCard | null =>
  isOff(input, "emotions") ? { type: "intro-emotions" } : null;

/** People step off. */
export const introPeople = (input: RecapInput): RecapCard | null =>
  isOff(input, "people") ? { type: "intro-people" } : null;

/** Photos step off. */
export const introPhotos = (input: RecapInput): RecapCard | null =>
  isOff(input, "photos") ? { type: "intro-photos" } : null;

/** Tags the check-in offers: archived tags stay out. */
export const getActiveTags = (tags: Tag[]) =>
  tags.filter((tag) => !tag.isArchived);
