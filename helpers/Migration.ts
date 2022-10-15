import _ from "lodash";
import { ImportData } from "./Import";

export const migrateImportData = (data: ImportData): ImportData => {
  let { items, settings, tags, version } = data;

  let newTags = (tags || []);
  const newItems = {};

  if(_.isArray(settings?.tags)) {
    newTags = settings.tags;
    settings = _.omit(settings, 'tags');
  }
  
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
  
  newTags = newTags.map((tag) => {
    const newTag = { ...tag };
    if (tag.color === "stone") {
      newTag.color = "slate";
    }
    return newTag;
  });
  
  return {
    version,
    items: newItems,
    settings,
    tags: newTags
  };
};