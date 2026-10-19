import { MAX_TAGS, MAX_TAGS_MORE } from "@/constants/config";
import { getItemLimit } from "@/lib/item-limit";
import { useFeatureFlag } from "@/state/feature-flags";
import type { Tag } from "./tags-provider";

/** Tag limit: {@link MAX_TAGS_MORE} while flag `more-tags` is on. */
export const useMaxTags = () =>
  useFeatureFlag("more-tags") ? MAX_TAGS_MORE : MAX_TAGS;

/**
 * Tag cap state. Pass all stored tags: archived tags count toward `max`.
 * Read `max` from {@link useMaxTags}.
 */
export const getTagLimit = (tags: readonly Tag[], max: number) =>
  getItemLimit(tags, max);
