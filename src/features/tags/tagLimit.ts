import { MAX_TAGS } from "@/constants/Config";
import { getItemLimit } from "@/lib/itemLimit";
import type { Tag } from "./TagsProvider";

/**
 * Tag cap state. Pass all stored tags: archived tags count toward
 * {@link MAX_TAGS}.
 */
export const getTagLimit = (tags: readonly Tag[]) =>
  getItemLimit(tags, MAX_TAGS);
