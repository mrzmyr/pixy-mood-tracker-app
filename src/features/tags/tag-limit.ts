import { MAX_TAGS } from "@/constants/config";
import { getItemLimit } from "@/lib/item-limit";
import type { Tag } from "./tags-provider";

/**
 * Tag cap state. Pass all stored tags: archived tags count toward
 * {@link MAX_TAGS}.
 */
export const getTagLimit = (tags: readonly Tag[]) =>
  getItemLimit(tags, MAX_TAGS);
