import { usePreventRemove } from "expo-router";
import { useRef, useState } from "react";
import { askToCancel } from "@/lib/prompts";

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
  // State turns the guard off on the next render. Expo Router 58 warns when
  // `repeat` runs while the guard condition is still `true`.
  const [isLeaving, setIsLeaving] = useState(false);
  // Ref covers navigation blocked before that render commits.
  const isLeavingRef = useRef(false);

  const leave = () => {
    isLeavingRef.current = true;
    setIsLeaving(true);
  };

  const confirmDiscard = async (repeat: () => void) => {
    try {
      await askToCancel();
    } catch {
      // Keep editing when the user dismisses the prompt.
      return;
    }
    leave();
    onDiscard?.();
    repeat();
  };

  usePreventRemove(isDirty && !isLeaving, ({ repeat }) => {
    if (isLeavingRef.current) {
      repeat();
      return;
    }
    confirmDiscard(repeat);
  });

  return { allowLeave: leave };
};
