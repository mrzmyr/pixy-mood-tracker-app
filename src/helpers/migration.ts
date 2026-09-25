import clone from "lodash/clone";
import isArray from "lodash/isArray";
import omit from "lodash/omit";
import values from "lodash/values";
import type { LogItem } from "@/hooks/useLogs";
import type { ImportData } from "./Import";

interface MigratedData extends ImportData {
  items: LogItem[];
}

export const migrateImportData = (data: ImportData): MigratedData => {
  const { items, settings, tags, version } = data;

  let newItems = clone(items);

  if (!isArray(newItems)) {
    newItems = values(newItems);
  }

  newItems = newItems.map((item) => {
    const newItem = { ...item };

    if (!item?.tags) {
      newItem.tags = [];
    }

    return newItem;
  });

  const _tags = (tags || settings?.tags || []).map((tag) => {
    if (tag.color === "stone") {
      tag.color = "slate";
    }
    return tag;
  });

  const _settings = omit(settings, "tags");

  if (!_settings.actionsDone) {
    _settings.actionsDone = [];
  }

  return {
    version: version || "1.0.0",
    items: newItems,
    settings: _settings,
    tags: _tags,
  };
};
