import countBy from "lodash/countBy";
import type { LogItem } from "../useLogs";
import type { Tag } from "../useTags";

export interface TagsPeakData {
  tags: (Tag & {
    items: LogItem[];
  })[];
}

const MIN_PEAKS = 3;

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
