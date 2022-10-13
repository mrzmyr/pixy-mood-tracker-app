import _ from "lodash";
import { LogsState } from "../hooks/useLogs";
import { SettingsState } from "../hooks/useSettings";
import { Tag } from "../hooks/useTags";

interface ImportData {
  items: LogsState["items"];
  tags?: Tag[];
  settings: SettingsState;
}

export const migrateImportData = (data: ImportData): ImportData => {
  const { items, settings, tags } = data;

  let newTags = tags || [];
  const newItems = {};

  Object.values(items).forEach((item) => {
    const newItem = { ...item };
    if (item?.tags) {
      newItem.tags = item.tags.map((tag) => {
        const newTag = { ...tag };
        if (tag.color === "stone") {
          newTag.color = "slate";
        }
        return newTag;
      });
    }
    newItems[item.date] = newItem;
  });

  if(!tags && _.isArray(settings?.tags)) {
    newTags = settings.tags.map((tag) => {
      const newTag = { ...tag };
      if (tag.color === "stone") {
        newTag.color = "slate";
      }
      return newTag;
    });
  }
  
  return {
    items: newItems,
    settings,
    tags: newTags
  };
};