import _ from "lodash";
import { LogItem } from "../useLogs";
import { Tag } from "../useTags";

export interface TagsPeakData {
  tags: (Tag & {
    items: LogItem[];
  })[]
}

const MIN_PEAKS = 3;

export const getTagsPeaksData = (items: LogItem[], settingsTags: Tag[]): TagsPeakData => {
  const distribution = _.countBy(
    items.flatMap((item) => item.tags.map((tag) => tag.id))
  );

  const tags = Object.keys(distribution)
    .filter((key) => {
      const tag = settingsTags.find((tag) => tag.id === key);

      return (
        distribution[key] >= MIN_PEAKS &&
        tag !== undefined &&
        !tag.isArchived
      )
    })
    .map((key) => ({
      ...settingsTags.find((tag) => tag.id === key)!,
      items: items.filter((item) => item.tags.find((tag) => tag.id === key)),
    }))
    .filter((tag) => tag && tag.items.length > 0)

  return {
    tags,
  };
};