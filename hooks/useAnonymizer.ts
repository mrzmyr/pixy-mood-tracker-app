import _ from "lodash";
import { LogItem } from "./useLogs";
import { Tag } from "./useTags";

interface AnonmizedTag extends Omit<Tag, "title"> {
  titleLength: number;
}
interface AnonmizedLogItem extends Omit<LogItem, 'tags' | 'message'> {
  tags?: AnonmizedTag[]
  messageLength: number;
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
  return {
    anonymizeTag,
    anonymizeItem
  }
}