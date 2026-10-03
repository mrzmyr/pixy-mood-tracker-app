import clone from "lodash/clone";
import isArray from "lodash/isArray";
import omit from "lodash/omit";
import values from "lodash/values";
import type { LogItem } from "@/features/logs";
import type { ImportData } from "./import";

interface MigratedData extends ImportData {
  items: LogItem[];
}

/**
 * Normalize any supported export version to the current import shape.
 *
 * Converts keyed items to an array, moves `settings.tags` to `tags`, and
 * maps the removed `stone` tag color to `slate`. Tag objects from `data`
 * are mutated in place.
 */
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
