import dayjs from "dayjs";
import zipObject from "lodash/zipObject";
import type { LogItem } from "../useLogs";
import type { Tag } from "../useTags";

interface DistributionTag extends Tag {
  periode1Count: number;
  periode2Count: number;
  total: number;
  diff: number;
  type: "increase" | "decrease" | "same";
}

/** Tags whose usage changed between the older and newer 4-week period. */
export interface TagsDistributionTrendData {
  tags: DistributionTag[];
}

/** Empty state before statistics load. */
export const defaultTagsDistributionTrendData: TagsDistributionTrendData = {
  tags: [],
};

interface TagCounter {
  [key: Tag["id"]]: Tag & {
    count: number;
  };
}

const getTrendType = (
  periode1Count: number,
  periode2Count: number
): DistributionTag["type"] => {
  if (periode2Count > periode1Count) {
    return "increase";
  }
  if (periode2Count < periode1Count) {
    return "decrease";
  }
  return "same";
};

const SCALE_TYPE = "week";
const SCALE_RANGE = 8;

/**
 * Compare tag usage over the last 8 weeks.
 *
 * Only tags used in both periods with a difference above 3 are returned.
 * Every tag on an entry from the last 8 weeks must exist in `tags`,
 * otherwise the count lookup throws.
 */
export const getTagsDistributionTrendData = (
  items: LogItem[],
  tags: Tag[]
): TagsDistributionTrendData => {
  const distributionPeriode1: TagCounter = zipObject(
    tags.map((d) => d.id),
    tags.map((d) => ({ ...d, count: 0 }))
  );

  const distributionPeriode2: TagCounter = zipObject(
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

  for (let i = SCALE_RANGE / 2; i < SCALE_RANGE; i += 1) {
    const start = dayjs().subtract(i, SCALE_TYPE).startOf(SCALE_TYPE);
    const _items = items.filter((item) => {
      const itemDate = dayjs(item.dateTime);
      return itemDate.isSame(start, SCALE_TYPE);
    });

    for (const item of _items) {
      for (const tag of item.tags) {
        distributionPeriode1[tag.id].count += 1;
      }
    }
  }

  for (let i = 0; i < SCALE_RANGE / 2; i += 1) {
    const start = dayjs().subtract(i, SCALE_TYPE).startOf(SCALE_TYPE);
    const _items = items.filter((item) => {
      const itemDate = dayjs(item.dateTime);
      return itemDate.isSame(start, SCALE_TYPE);
    });

    for (const item of _items) {
      for (const tag of item.tags) {
        distributionPeriode2[tag.id].count += 1;
      }
    }
  }

  const _tags = tags.flatMap((tag): DistributionTag[] => {
    const periode1Count = distributionPeriode1[tag.id].count;
    const periode2Count = distributionPeriode2[tag.id].count;

    if (
      !(
        Math.abs(periode1Count - periode2Count) > 3 &&
        periode1Count >= 1 &&
        periode2Count >= 1
      )
    ) {
      return [];
    }

    return [
      {
        ...tag,
        periode1Count,
        periode2Count,
        total: periode1Count + periode2Count,
        diff: Math.abs(periode2Count - periode1Count),
        type: getTrendType(periode1Count, periode2Count),
      },
    ];
  });

  return {
    tags: _tags,
  };
};
