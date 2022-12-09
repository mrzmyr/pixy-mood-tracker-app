import _ from "lodash";
import { LogDay, LogItem } from "./useLogs";
import { Tag } from "./useTags";

interface AnonmizedTag extends Omit<Tag, "title"> {
  titleLength: number;
}

interface AnonmizedLogItem extends Omit<LogItem, 'tags' | 'message'> {
  tags?: AnonmizedTag[]
  messageLength: number;
}

interface AnonmizedLogDay extends Omit<LogDay, 'items'> {
  items: AnonmizedLogItem[]
}

export const useAnonymizer = () => {
  const anonymizeTag = (tag: Tag): AnonmizedTag => {
    return {
      ..._.omit(tag, 'title'),
      titleLength: tag?.title?.length,
    }
  }
  const anonymizeItem = (item: LogItem): AnonmizedLogItem => {
    const resultItem: AnonmizedLogItem = _.omit({
      ...item,
      messageLength: item.message.length,
    }, ['message', 'tags']);

    if (item?.tags) {
      resultItem.tags = item.tags.map(anonymizeTag)
    }

    return resultItem
  }

  const anonymizeDay = (day: LogDay): AnonmizedLogDay => {
    return {
      ...day,
      items: day.items.map(anonymizeItem),
    }
  }

  return {
    anonymizeTag,
    anonymizeItem,
    anonymizeDay,
  }
}