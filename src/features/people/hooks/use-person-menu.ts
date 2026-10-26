import { t } from "@/lib/translation";
import type { Person } from "../people-provider";
import { usePersonActions } from "./use-person-actions";

/** Stable ids of the person menu rows; analytics-safe, never free text. */
export type PersonMenuActionId = "edit" | "archive" | "delete";

/** One menu row. `systemImage` is an SF Symbol name, used on iOS only. */
export interface PersonMenuAction {
  id: PersonMenuActionId;
  title: string;
  systemImage: string;
  destructive: boolean;
}

/** Menu rows for a person tile: Edit, Archive or Unarchive, Delete. */
export const getPersonMenuActions = (
  person: Pick<Person, "isArchived">
): PersonMenuAction[] => [
  { id: "edit", title: t("edit"), systemImage: "pencil", destructive: false },
  {
    id: "archive",
    title: t(person.isArchived ? "people_unarchive" : "people_archive"),
    systemImage: person.isArchived ? "tray.and.arrow.up" : "archivebox",
    destructive: false,
  },
  { id: "delete", title: t("delete"), systemImage: "trash", destructive: true },
];

/**
 * Runs a picked person menu row. Archive and Unarchive act at once; Delete
 * asks first.
 */
export const usePersonMenu = () => {
  const { confirmDelete, toggleArchived } = usePersonActions();

  return (
    person: Person,
    actionId: PersonMenuActionId,
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
      toggleArchived(person);
      if (!person.isArchived) {
        onArchived?.();
      }
    }
    if (actionId === "delete") {
      confirmDelete(person.id, { onDeleted });
    }
  };
};
