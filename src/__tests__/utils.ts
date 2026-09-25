import { uniqueId } from "lodash";
import type { LogItem } from "../hooks/useLogs";

export const _generateItem = (item: Partial<LogItem>): LogItem => {
  const newItem: LogItem = {
    id: uniqueId(),
    rating: "neutral",
    message: "🥹",
    date: "2020-01-01",
    sleep: {
      quality: "neutral",
    },
    createdAt: new Date().toISOString(),
    dateTime: new Date().toISOString(),
    tags: [],
    emotions: [],
    ...item,
  };

  if (item.date && !item.dateTime) {
    newItem.dateTime = new Date(item.date).toISOString();
  }

  if (item.date && !item.createdAt) {
    newItem.createdAt = new Date(item.date).toISOString();
  }

  return newItem;
};
