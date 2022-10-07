import _ from "lodash";
import { LogItem } from "./useLogs";
import { Tag } from "./useSettings";

interface AnonmizedTag extends Omit<Tag, "title"> {
  titleLength: number;
}
interface AnonmizedLogItem extends Omit<LogItem, 'tags' | 'message'> {
  tags: AnonmizedTag[]
}

export const useAnonymizer = () => {
  const anonymizeTag = (tag: Tag): AnonmizedTag => {
    return {
      ..._.omit(tag, 'title'),
      titleLength: tag.title.length,
    }
  }
  const anonymizeItem = (item: LogItem): AnonmizedLogItem => {
    const tags: AnonmizedTag[] = item?.tags?.map(anonymizeTag) || [];
    return _.omit({
      ...item,
      tags,
      messageLength: item.message.length,
    }, ['message'])
  }
  return {
    anonymizeTag,
    anonymizeItem
  }
}