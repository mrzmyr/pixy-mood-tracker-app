import _ from "lodash";
import { LogItem } from "../useLogs";
import { Tag } from "../useTags";

export interface TagsDistributionData {
  tags: {
    id: string;
    details: Tag;
    count: number;
  }[];
}

export const defaultTagsDistributionData: TagsDistributionData = {
  tags: [],
}

export const dummyTagsDistributionData: TagsDistributionData = {
  tags: [
    {
      id: "1",
      details: {
        id: "1",
        title: "Tag 1",
        color: 'yellow',
      },
      count: 10,
    },
    {
      id: "2",
      details: {
        id: "2",
        title: "Tag 2",
        color: 'red',
      },
      count: 5,
    },
    {
      id: "3",
      details: {
        id: "3",
        title: "Tag 3",
        color: 'blue',
      },
      count: 3,
    },
    {
      id: "4",
      details: {
        id: "4",
        title: "Tag 4",
        color: 'green',
      },
      count: 2,
    },
  ],
}

export const getTagsDistributionData = (items: LogItem[], tags: Tag[]): TagsDistributionData => {
  const distribution = _.countBy(
    items.flatMap((item) => item?.tags?.map((tag) => tag?.id))
  );
  const _tags = Object.keys(distribution)
    .map((key) => ({
      details: tags.find((tag) => tag.id === key)!,
      id: key,
      count: distribution[key],
    }))
    .filter((tag) => tag.details !== undefined)
    .filter((tag) => !tag.details.isArchived)
    .sort((a, b) => b.count - a.count);

  return {
    tags: _tags,
  };
};
