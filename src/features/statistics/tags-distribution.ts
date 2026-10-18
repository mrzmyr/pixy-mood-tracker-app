import countBy from "lodash/countBy";
import type { LogItem } from "@/features/logs";
import type { Tag } from "@/features/tags";

/** Tag usage counts for the statistics tags card, most used first. */
export interface TagsDistributionData {
  tags: {
    id: string;
    details: Tag;
    count: number;
  }[];
}

/** Empty state before statistics load. */
export const defaultTagsDistributionData: TagsDistributionData = {
  tags: [],
};

/** Fixed placeholder shown blurred behind the "not enough data" overlay. */
export const dummyTagsDistributionData: TagsDistributionData = {
  tags: [
    {
      id: "1",
      details: {
        id: "1",
        title: "Tag 1",
        color: "yellow",
      },
      count: 10,
    },
    {
      id: "2",
      details: {
        id: "2",
        title: "Tag 2",
        color: "red",
      },
      count: 5,
    },
    {
      id: "3",
      details: {
        id: "3",
        title: "Tag 3",
        color: "blue",
      },
      count: 3,
    },
    {
      id: "4",
      details: {
        id: "4",
        title: "Tag 4",
        color: "green",
      },
      count: 2,
    },
  ],
};

/**
 * Count tag usage across entries. Tags that are archived or missing from
 * `tags` are dropped.
 */
export const getTagsDistributionData = (
  items: LogItem[],
  tags: Tag[]
): TagsDistributionData => {
  const distribution = countBy(
    items.flatMap((item) => item?.tags?.map((tag) => tag?.id))
  );
  const _tags = Object.keys(distribution)
    .flatMap((key) => {
      const details = tags.find((tag) => tag.id === key);
      return details === undefined || details.isArchived
        ? []
        : [{ details, id: key, count: distribution[key] }];
    })
    .sort((a, b) => b.count - a.count);

  return {
    tags: _tags,
  };
};
