import omit from "lodash/omit";
import type { LogDay, LogItem } from "@/features/logs";
import type { Tag } from "@/features/tags";

interface AnonmizedTag extends Omit<Tag, "title"> {
  titleLength: number;
}

interface AnonmizedLogItem extends Omit<LogItem, "tags" | "message"> {
  tags?: AnonmizedTag[];
  messageLength: number;
}

interface AnonmizedLogDay extends Omit<LogDay, "items"> {
  items: AnonmizedLogItem[];
}

const anonymizeTag = (tag: Tag): AnonmizedTag => ({
  ...omit(tag, "title"),
  titleLength: tag?.title?.length,
});
const anonymizeItem = (item: LogItem): AnonmizedLogItem => {
  const resultItem: AnonmizedLogItem = omit(
    {
      ...item,
      messageLength: item.message.length,
    },
    ["message", "tags"]
  );

  if (item?.tags) {
    resultItem.tags = item.tags.map(anonymizeTag);
  }

  return resultItem;
};

const anonymizeDay = (day: LogDay): AnonmizedLogDay => ({
  ...day,
  items: day.items.map(anonymizeItem),
});

/**
 * Strip user-written text from tags and entries before they reach analytics.
 *
 * Titles and messages are replaced by their lengths; every other field,
 * including emotion keys, passes through unchanged.
 */
export const useAnonymizer = () => ({
  anonymizeTag,
  anonymizeItem,
  anonymizeDay,
});
