import { Platform } from "react-native";
import type { PressableProps } from "react-native";
import useHaptics from "@/hooks/useHaptics";
import { t } from "@/lib/translation";
import type { ItemMenuActions } from "./itemMenuTypes";

/** iOS opens the system context menu on a long press (`ItemMenu.ios.tsx`). */
const HAS_NATIVE_MENU = Platform.OS === "ios";

/**
 * Pressable props for an item inside `ItemMenu`. Without a native menu, a
 * long press opens the editor. Screen readers get every menu action.
 */
export const useItemMenuPressProps = (
  menu: ItemMenuActions | undefined
): Pick<
  PressableProps,
  "onLongPress" | "accessibilityActions" | "onAccessibilityAction"
> => {
  const haptics = useHaptics();

  if (!menu) {
    return {};
  }

  const handlers = new Map([
    ["edit", menu.onEdit],
    ["archive", menu.onArchive],
    ["delete", menu.onDelete],
  ]);

  return {
    onLongPress: HAS_NATIVE_MENU
      ? undefined
      : async () => {
          await haptics.impact();
          menu.onEdit();
        },
    accessibilityActions: [
      { name: "edit", label: t("edit") },
      ...(menu.onArchive
        ? [{ name: "archive", label: menu.archiveLabel }]
        : []),
      { name: "delete", label: t("delete") },
    ],
    onAccessibilityAction: ({ nativeEvent }) => {
      handlers.get(nativeEvent.actionName)?.();
    },
  };
};
