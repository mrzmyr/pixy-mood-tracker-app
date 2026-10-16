import { usePreventRemove } from "expo-router/react-navigation";
import { useNavigation } from "expo-router";
import type { NavigationAction } from "expo-router/react-navigation";
import { useRef } from "react";
import { askToCancel } from "@/helpers/prompts";

/**
 * Ask before a screen with unsaved changes closes by Android back, the back
 * gesture, or any other navigation that bypasses the screen's own buttons.
 *
 * Keep editing on cancel. On confirm, call `onDiscard`, then let the
 * navigation continue.
 *
 * @returns `allowLeave`: call it right before the screen closes itself (save,
 *   delete, or a confirmed cancel), so the guard does not ask a second time.
 *   The `isDirty` flag cannot do this, because it updates only after render.
 */
export const useDiscardGuard = ({
  isDirty,
  onDiscard,
}: {
  isDirty: boolean;
  onDiscard?: () => void;
}) => {
  const navigation = useNavigation();
  const isLeaving = useRef(false);

  const confirmDiscard = async (action: NavigationAction) => {
    try {
      await askToCancel();
    } catch {
      // Keep editing when the user dismisses the prompt.
      return;
    }
    isLeaving.current = true;
    onDiscard?.();
    navigation.dispatch(action);
  };

  usePreventRemove(isDirty, ({ data }) => {
    if (isLeaving.current) {
      navigation.dispatch(data.action);
      return;
    }
    confirmDiscard(data.action);
  });

  return {
    allowLeave: () => {
      isLeaving.current = true;
    },
  };
};
