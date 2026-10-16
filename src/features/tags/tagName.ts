import { MAX_TAG_LENGTH, MIN_TAG_LENGTH } from "@/constants/Config";

/** The counter shows only above this share of the limit. */
const COUNTER_THRESHOLD = 0.9;

/** True when a title fits the tag length limits. */
export const isValidTagTitle = (title: string) =>
  title.length >= MIN_TAG_LENGTH && title.length <= MAX_TAG_LENGTH;

/** True when the `n/MAX` counter should show. */
export const shouldShowCounter = (length: number) =>
  length > MAX_TAG_LENGTH * COUNTER_THRESHOLD;
