import countBy from "lodash/countBy";
import type { LogItem } from "@/features/logs";
import type { Tag } from "@/features/tags";

/** Tags used at least 3 times, each with the entries that use it. */
export interface TagsPeakData {
  tags: (Tag & {
    items: LogItem[];
  })[];
}

const MIN_PEAKS = 3;

/**
 * Find frequently used tags. Tags that are archived or missing from
 * `settingsTags` are dropped.
 */
export const getTagsPeaksData = (
  items: LogItem[],
  settingsTags: Tag[]
): TagsPeakData => {
  const distribution = countBy(
    items.flatMap((item) => item.tags.map((tag) => tag.id))
  );

  const tags = Object.keys(distribution).flatMap((key) => {
    const settingsTag = settingsTags.find((tag) => tag.id === key);

    if (
      distribution[key] < MIN_PEAKS ||
      settingsTag === undefined ||
      settingsTag.isArchived
    ) {
      return [];
    }

    const tagItems = items.filter((item) =>
      item.tags.find((tag) => tag.id === key)
    );

    return tagItems.length > 0 ? [{ ...settingsTag, items: tagItems }] : [];
  });

  return {
    tags,
  };
};
