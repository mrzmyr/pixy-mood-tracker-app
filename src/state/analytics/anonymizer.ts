import omit from "lodash/omit";
// oxlint-disable-next-line eslint/no-restricted-imports -- Persisted feature types stay in their modules until storage refactor.
import type { Tag } from "@/features/tags";

interface AnonmizedTag extends Omit<Tag, "title"> {
  titleLength: number;
}

const anonymizeTag = (tag: Tag): AnonmizedTag => ({
  ...omit(tag, "title"),
  titleLength: tag?.title?.length,
});

/**
 * Strip user-written text from tags before they reach analytics.
 *
 * Titles are replaced by their lengths; every other field passes through
 * unchanged.
 */
export const useAnonymizer = () => ({
  anonymizeTag,
});
