import type { RATING_MAPPING } from "@/constants/Ratings";
import { tDynamic } from "@/lib/translation";

/** Translated mood name of `rating`, for example "Good". */
export const getRatingLabel = (rating: keyof typeof RATING_MAPPING) =>
  tDynamic(rating);
