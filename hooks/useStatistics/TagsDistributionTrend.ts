import dayjs from "dayjs";
import _ from "lodash";
import { LogItem } from "../useLogs";
import { Tag } from "../useTags";

interface DistributionTag extends Tag {
  periode1Count: number;
  periode2Count: number;
  total: number;
  diff: number;
  type: "increase" | "decrease" | "same";
}

export interface TagsDistributionTrendData {
  tags: DistributionTag[];
}

export const defaultTagsDistributionTrendData: TagsDistributionTrendData = {
  tags: [],
};

interface TagCounter {
  [key: Tag["id"]]: Tag & {
    count: number;
  };
}

const SCALE_TYPE = "week";
const SCALE_RANGE = 8;

export const getTagsDistributionTrendData = (
  items: LogItem[],
  tags: Tag[]
): TagsDistributionTrendData => {
  const distributionPeriode1: TagCounter = _.zipObject(
    tags.map((d) => d.id),
    tags.map((d) => ({ ...d, count: 0 }))
  );

  const distributionPeriode2: TagCounter = _.zipObject(
    tags.map((d) => d.id),
    tags.map((d) => ({ ...d, count: 0 }))
  );

  // if tags exist inside the settings tags
  const filteredItems = items.filter((item) =>
    item?.tags?.some((tag) => tags.some((d) => d.id === tag.id))
  );

  if (filteredItems.length === 0) {
    return defaultTagsDistributionTrendData;
  }

  for (let i = SCALE_RANGE / 2; i < SCALE_RANGE; i++) {
    const start = dayjs().subtract(i, SCALE_TYPE).startOf(SCALE_TYPE);
    const _items = items.filter((item) => {
      const itemDate = dayjs(item.dateTime);
      return itemDate.isSame(start, SCALE_TYPE);
    });

    _items.forEach((item) => {
      item.tags.forEach((tag) => {
        distributionPeriode1[tag.id].count++;
      });
    });
  }

  for (let i = 0; i < SCALE_RANGE / 2; i++) {
    const start = dayjs().subtract(i, SCALE_TYPE).startOf(SCALE_TYPE);
    const _items = items.filter((item) => {
      const itemDate = dayjs(item.dateTime);
      return itemDate.isSame(start, SCALE_TYPE);
    });

    _items.forEach((item) => {
      item.tags.forEach((tag) => {
        distributionPeriode2[tag.id].count++;
      });
    });
  }

  const _tags = tags
    .map((tag) => ({
      ...tag,
      periode1Count: distributionPeriode1[tag.id].count,
      periode2Count: distributionPeriode2[tag.id].count,
      total: distributionPeriode1[tag.id].count + distributionPeriode2[tag.id].count,
      diff:
        Math.abs(distributionPeriode2[tag.id].count - distributionPeriode1[tag.id].count),
      type:
        distributionPeriode2[tag.id].count > distributionPeriode1[tag.id].count
          ? "increase"
          : distributionPeriode2[tag.id].count <
            distributionPeriode1[tag.id].count
            ? "decrease"
            : "same" as DistributionTag["type"],
    }))
    .filter((tag) => {
      return (
        Math.abs(tag.periode1Count - tag.periode2Count) > 3 &&
        tag.periode1Count >= 1 &&
        tag.periode2Count >= 1
      );
    });

  return {
    tags: _tags
  };
};
