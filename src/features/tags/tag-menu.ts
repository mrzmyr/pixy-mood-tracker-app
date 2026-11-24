import { t } from "@/lib/translation";
import type { Tag } from "./tags-provider";
import { useTagActions } from "./use-tag-actions";

/** Stable ids of the tag menu rows; analytics-safe, never free text. */
export type TagMenuActionId = "edit" | "archive" | "delete";

/** One menu row. `systemImage` is an SF Symbol name, used on iOS only. */
export interface TagMenuAction {
  id: TagMenuActionId;
  title: string;
  systemImage: string;
  destructive: boolean;
}

/** Menu rows for a tag chip: Edit, Archive or Unarchive, Delete. */
export const getTagMenuActions = (
  tag: Pick<Tag, "isArchived">
): TagMenuAction[] => [
  { id: "edit", title: t("edit"), systemImage: "pencil", destructive: false },
  {
    id: "archive",
    title: t(tag.isArchived ? "tags_unarchive" : "archive_tag"),
    systemImage: tag.isArchived ? "tray.and.arrow.up" : "archivebox",
    destructive: false,
  },
  { id: "delete", title: t("delete"), systemImage: "trash", destructive: true },
];

/**
 * Runs a picked tag menu row. Archive and Unarchive act at once; Delete
 * asks first.
 */
export const useTagMenu = () => {
  const { confirmDelete, toggleArchived } = useTagActions();

  return (
    tag: Tag,
    actionId: TagMenuActionId,
    {
      onEdit,
      onArchived,
      onDeleted,
    }: {
      onEdit: () => void;
      /** Runs after Archive, not after Unarchive. */
      onArchived?: () => void;
      onDeleted?: () => void;
    }
  ) => {
    if (actionId === "edit") {
      onEdit();
    }
    if (actionId === "archive") {
      toggleArchived(tag);
      if (!tag.isArchived) {
        onArchived?.();
      }
    }
    if (actionId === "delete") {
      confirmDelete(tag, { onDeleted });
    }
  };
};
