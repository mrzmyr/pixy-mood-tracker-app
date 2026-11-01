import { usePreventRemove } from "expo-router/react-navigation";
import { useNavigation } from "expo-router";
import type { NavigationAction } from "expo-router/react-navigation";
import { useEffect, useRef } from "react";
import { askToCancel } from "@/lib/prompts";

/**
 * Ask before a screen with unsaved changes closes by Android back, the back
 * gesture, or any other navigation that bypasses the screen's own buttons.
 *
 * Keep editing on cancel. On confirm, call `onDiscard`, then let the
 * navigation continue.
 *
 * `swipeDownWhenClean`: the route blocks the swipe-down gesture
 * (`gestureEnabled: false`). While the form is clean, allow it, because
 * closing loses nothing. A changed form blocks the swipe again.
 *
 * @returns `allowLeave`: call it right before the screen closes itself (save,
 *   delete, or a confirmed cancel), so the guard does not ask a second time.
 *   The `isDirty` flag cannot do this, because it updates only after render.
 */
export const useDiscardGuard = ({
  isDirty,
  onDiscard,
  swipeDownWhenClean = false,
}: {
  isDirty: boolean;
  onDiscard?: () => void;
  swipeDownWhenClean?: boolean;
}) => {
  const navigation = useNavigation();
  const isLeaving = useRef(false);

  useEffect(() => {
    if (swipeDownWhenClean) {
      navigation.setOptions({ gestureEnabled: !isDirty });
    }
  }, [navigation, swipeDownWhenClean, isDirty]);

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
