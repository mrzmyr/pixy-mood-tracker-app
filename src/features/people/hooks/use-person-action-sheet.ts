import { ActionSheetIOS, Platform } from "react-native";
import { t } from "@/lib/translation";
import type { Person } from "../people-provider";
import { usePersonActions } from "./use-person-actions";

/**
 * Actions for a check-in person tile released without moving. iOS: native
 * action sheet with Edit, Archive or Unarchive, Delete, Cancel. Archive acts
 * at once; Delete asks first. Elsewhere it opens the editor.
 */
export const usePersonActionSheet = () => {
  const { confirmDelete, toggleArchived } = usePersonActions();

  return (
    person: Person,
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
    if (Platform.OS !== "ios") {
      onEdit();
      return;
    }
    const actions = [
      onEdit,
      () => {
        toggleArchived(person);
        if (!person.isArchived) {
          onArchived?.();
        }
      },
      () => confirmDelete(person.id, { onDeleted }),
    ];
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: person.name,
        options: [
          t("edit"),
          t(person.isArchived ? "people_unarchive" : "people_archive"),
          t("delete"),
          t("cancel"),
        ],
        destructiveButtonIndex: 2,
        cancelButtonIndex: 3,
      },
      (index) => actions[index]?.()
    );
  };
};
