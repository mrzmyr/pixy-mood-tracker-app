import { ActionSheetIOS, Platform } from "react-native";
import { t } from "@/lib/translation";
import type { NativeTileMenuAction } from "./native-people-tile";

/** `ids` with `sourceId` moved to the spot of `targetId`. Pure. */
export const moveId = (ids: string[], sourceId: string, targetId: string) => {
  const targetIndex = ids.indexOf(targetId);
  if (targetIndex === -1 || !ids.includes(sourceId)) {
    return ids;
  }
  const rest = ids.filter((id) => id !== sourceId);
  return [...rest.slice(0, targetIndex), sourceId, ...rest.slice(targetIndex)];
};

/**
 * Menu for a sortable tile released without moving. iOS: action sheet with
 * the menu rows. Elsewhere the first row runs.
 */
export const showTileMenu = <Id extends string>(
  title: string,
  actions: NativeTileMenuAction<Id>[],
  onAction: (actionId: Id) => void
) => {
  if (Platform.OS !== "ios") {
    if (actions[0]) {
      onAction(actions[0].id);
    }
    return;
  }
  ActionSheetIOS.showActionSheetWithOptions(
    {
      title,
      options: [...actions.map((action) => action.title), t("cancel")],
      destructiveButtonIndex: actions.findIndex((action) => action.destructive),
      cancelButtonIndex: actions.length,
    },
    (index) => {
      const action = actions[index];
      if (action) {
        onAction(action.id);
      }
    }
  );
};
